// --- CONFIGURAÇÕES GLOBAIS DO APLICATIVO ---
const APP_VERSION = 'v1.0.1';
const APP_UPDATE_DATE = '13 de Julho de 2026';

class ViewManager {
    constructor() {
        this.mainDisplay = document.getElementById('main-display');
        this.mainIframe = document.getElementById('main-iframe');
        this.wrapperSelect = document.getElementById('wrapper-song-select');
        this.inputTitle = document.getElementById('song-title-input');

        this.btnToggle = document.getElementById('btn-action-toggle');
        this.btnAdd = document.getElementById('btn-action-add');
        this.btnEdit = document.getElementById('btn-action-edit');
        this.btnDelete = document.getElementById('btn-action-delete');
        this.btnSave = document.getElementById('btn-action-save');
        this.btnCancel = document.getElementById('btn-action-cancel');
        this.btnAddSheetMusic = document.getElementById('btn-add-sheet-music');

        this.onHydrateScores = null;

        this.initPasteHandling();
    }

    initPasteHandling() {
        this.mainDisplay.addEventListener('paste', (e) => {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData;
            const text = clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }

    showLiturgy() {
        this.mainDisplay.classList.add('d-none');
        this.mainIframe.classList.remove('d-none');
        const currentSrc = this.mainIframe.src;
        if (!currentSrc || currentSrc === window.location.href) {
            this.mainIframe.src = "https://liturgiadiaria.edicoescnbb.com.br/";
        }
    }

    showRepertoire(content = '') {
        this.mainIframe.classList.add('d-none');
        this.mainDisplay.classList.remove('d-none');
        this.mainDisplay.setAttribute('contenteditable', 'false');
        this.mainDisplay.innerHTML = content;

        if (this.onHydrateScores) this.onHydrateScores();

        this.toggleEditTopBar(false);
    }

    enterEditMode(title = '', content = '') {
        this.mainIframe.classList.add('d-none');
        this.mainDisplay.classList.remove('d-none');
        this.mainDisplay.setAttribute('contenteditable', 'true');
        this.mainDisplay.innerHTML = content;

        if (this.onHydrateScores) this.onHydrateScores();

        this.mainDisplay.focus();
        this.inputTitle.value = title;
        this.toggleEditTopBar(true);
    }

    toggleEditTopBar(isEditing) {
        if (isEditing) {
            this.wrapperSelect.classList.add('d-none');
            this.inputTitle.classList.remove('d-none');
            this.btnToggle.classList.add('d-none');
            this.btnAdd.classList.add('d-none');
            this.btnEdit.classList.add('d-none');
            this.btnDelete.classList.add('d-none');
            this.btnSave.classList.remove('d-none');
            this.btnCancel.classList.remove('d-none');
            if (this.btnAddSheetMusic) {
                this.btnAddSheetMusic.classList.remove('d-none');
                this.btnAddSheetMusic.classList.add('d-flex');
            }
        } else {
            this.inputTitle.classList.add('d-none');
            this.wrapperSelect.classList.remove('d-none');
            this.btnSave.classList.add('d-none');
            this.btnCancel.classList.add('d-none');
            this.btnToggle.classList.remove('d-none');
            this.btnAdd.classList.add('d-none');
            this.btnEdit.classList.add('d-none');
            this.btnDelete.classList.add('d-none');
            if (this.btnAddSheetMusic) {
                this.btnAddSheetMusic.classList.add('d-none');
                this.btnAddSheetMusic.classList.remove('d-flex');
            }
        }
    }

    toggleInlineActions(show) {
        if (show) {
            this.btnToggle.classList.add('d-none');
            this.btnAdd.classList.remove('d-none');
            this.btnEdit.classList.remove('d-none');
            this.btnDelete.classList.remove('d-none');
        } else {
            this.btnToggle.classList.remove('d-none');
            this.btnAdd.classList.add('d-none');
            this.btnEdit.classList.add('d-none');
            this.btnDelete.classList.add('d-none');
        }
    }

    getEditorData() {
        return {
            title: this.inputTitle.value.trim(),
            content: TextFormatter.processEditorData(this.mainDisplay)
        };
    }
}

class RepertoireController {
    constructor(ts, dbManager, viewManager, modalManager, backupManager) {
        this.ts = ts;
        this.db = dbManager;
        this.view = viewManager;
        this.modal = modalManager;

        this.currentMode = 'view';
        this.currentSongId = null;

        backupManager.onImportComplete = () => this.refreshSelectOptions();

        this.initEvents();
        this.refreshSelectOptions();
    }

    initEvents() {
        this.ts.on('change', (selectedId) => {
            this.currentSongId = selectedId;
            if (selectedId || selectedId === '') {
                const song = this.db.getSongById(selectedId);
                this.view.showRepertoire(song ? song.content : '');
            }
        });

        this.ts.on('dropdown_open', () => this.view.toggleInlineActions(false));

        this.view.btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.view.toggleInlineActions(true);
        });

        document.addEventListener('click', (e) => {
            const isAction = e.target.closest('#btn-action-add') || e.target.closest('#btn-action-edit') || e.target.closest('#btn-action-delete') || e.target.closest('#btn-action-toggle');
            if (!this.view.btnAdd.classList.contains('d-none') && !isAction) {
                this.view.toggleInlineActions(false);
            }
        });

        this.view.btnAdd.addEventListener('click', () => this.handleEditRequest(true));
        this.view.btnEdit.addEventListener('click', () => this.handleEditRequest(false));

        this.view.btnDelete.addEventListener('click', () => {
            if (!this.currentSongId) return;
            this.modal.show('confirmDeleteTitle', 'confirmDeleteBody', () => {
                this.db.deleteSong(this.currentSongId);
                this.currentSongId = null;
                this.refreshSelectOptions();
                this.view.showRepertoire('');
            });
        });

        this.view.btnSave.addEventListener('click', () => this.handleSave());
        this.view.btnCancel.addEventListener('click', () => {
            this.modal.show('confirmCancelTitle', 'confirmCancelBody', () => {
                this.currentMode = 'view';
                const song = this.db.getSongById(this.currentSongId);
                this.view.showRepertoire(song ? song.content : '');
            });
        });
    }

    refreshSelectOptions() {
        this.ts.clear(true);
        this.ts.clearOptions();
        this.db.getSongs().forEach(song => this.ts.addOption({ value: song.id, text: song.title }));
        if (this.currentSongId && this.db.getSongById(this.currentSongId)) {
            this.ts.setValue(this.currentSongId, true);
        }
    }

    handleEditRequest(isNew) {
        this.currentMode = isNew ? 'add' : 'edit';
        if (!isNew && !this.currentSongId) {
            alert('Selecione uma música para editar primeiro.');
            this.currentMode = 'view';
            return;
        }

        if (isNew) {
            this.currentSongId = null;
            this.ts.setValue('', true);
            this.view.enterEditMode('', '');
        } else {
            const song = this.db.getSongById(this.currentSongId);
            this.view.enterEditMode(song.title, song.content);
        }
    }

    handleSave() {
        const { title, content } = this.view.getEditorData();
        if (!title) { alert('O título da música não pode estar vazio!'); return; }

        if (this.db.titleExists(title, this.currentSongId)) {
            this.modal.show('duplicateTitle', 'duplicateBody', null, false);
            return;
        }

        this.modal.show('confirmSaveTitle', 'confirmSaveBody', () => {
            let savedSong;
            if (this.currentMode === 'add') {
                savedSong = this.db.addSong(title, content);
                this.currentSongId = savedSong.id;
            } else {
                savedSong = this.db.updateSong(this.currentSongId, title, content);
            }
            this.currentMode = 'view';
            this.refreshSelectOptions();
            this.ts.setValue(this.currentSongId, true);
            this.view.showRepertoire(savedSong ? savedSong.content : '');
        });
    }
}

// INICIALIZAÇÃO PRINCIPAL DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {

    // Inicia o Logger o mais rápido possível para pegar todos os erros
    const loggerManager = new LoggerManager(APP_VERSION, APP_UPDATE_DATE);

    // 1. Bibliotecas e Banco
    const tomSelectInstance = new TomSelect("#song-select", {
        create: false, sortField: { field: "text", direction: "asc" },
        placeholder: "Escolha a Música...", allowEmptyOption: false
    });
    const dbManager = new DatabaseManager();

    // 2. Controladores UI
    const prefsManager = new PreferencesManager(tomSelectInstance);
    const modalManager = new ModalManager(prefsManager);
    const viewManager = new ViewManager();
    const backupManager = new BackupManager(dbManager);

    const toolbar = new ToolbarController(viewManager, tomSelectInstance);

    // 3. Motores Musicais
    const musicTheory = new MusicTheory();
    const chordManager = new ChordManager(toolbar, musicTheory);
    const pianoManager = new PianoManager(musicTheory);
    const sheetMusicEditor = new SheetMusicEditor();

    // 4. Cérebro da Tela
    const repertoireController = new RepertoireController(tomSelectInstance, dbManager, viewManager, modalManager, backupManager);

    // --- MÁGICA DE PARTITURAS ---
    // Renderiza ao carregar do banco
    viewManager.onHydrateScores = () => {
        const blocks = viewManager.mainDisplay.querySelectorAll('.sheet-music-block');
        blocks.forEach(block => {
            if (block.innerHTML.trim() === '') {
                const data = ScoreCodec.decode(block.dataset.score);
                const svg = sheetMusicEditor.drawStandalone(data);
                if (svg) block.appendChild(svg);
            }
        });
    };

    // Abre modal de edição pelo botão flutuante
    if (viewManager.btnAddSheetMusic) {
        viewManager.btnAddSheetMusic.addEventListener('click', (e) => {
            e.preventDefault();
            sheetMusicEditor.open(null, null, (svgElement, currentData, existingBlock) => {
                insertSheetMusicBlock(svgElement, currentData, existingBlock);
            });
        });
    }

    // Abre modal de edição clicando numa partitura existente
    viewManager.mainDisplay.addEventListener('click', (e) => {
        if (viewManager.mainDisplay.getAttribute('contenteditable') === 'true') {
            const block = e.target.closest('.sheet-music-block');
            if (block) {
                const data = ScoreCodec.decode(block.dataset.score);
                sheetMusicEditor.open(data, block, (svgElement, currentData, existingBlock) => {
                    insertSheetMusicBlock(svgElement, currentData, existingBlock);
                });
            }
        }
    });

    // Injeta ou Atualiza no HTML
    function insertSheetMusicBlock(svgElement, data, existingBlock) {
        const compactString = ScoreCodec.encode(data);

        if (existingBlock) {
            existingBlock.dataset.score = compactString;
            existingBlock.innerHTML = '';
            existingBlock.appendChild(svgElement);
            return;
        }

        const block = document.createElement('div');
        block.className = 'sheet-music-block';
        block.contentEditable = 'false';
        block.dataset.score = compactString;
        block.appendChild(svgElement);

        viewManager.mainDisplay.focus();
        const sel = window.getSelection();

        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (viewManager.mainDisplay.contains(range.commonAncestorContainer)) {
                range.collapse(false);
                range.insertNode(block);

                // Quebra a linha e joga cursor pra baixo (melhor usabilidade)
                const br = document.createElement('br');
                range.setStartAfter(block);
                range.insertNode(br);
                range.setStartAfter(br);
                range.collapse(true);

                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
        }
        viewManager.mainDisplay.appendChild(block);
        viewManager.mainDisplay.appendChild(document.createElement('br'));
    }

    // --- 0. SERVICE WORKER E ATUALIZAÇÕES ---
    if ('serviceWorker' in navigator) {
        // Registra o Service Worker
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Falhou: ', err));

        // Escuta a mensagem de que uma nova versão foi ativada
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_INSTALLED') {
                // Checa se o SW estava no controle antes de avisar (evita o aviso na primeira visita do usuário na vida)
                if (navigator.serviceWorker.controller) {
                    const toastEl = document.getElementById('updateToast');
                    const msgEl = document.getElementById('updateToastMessage');
                    if (toastEl && msgEl) {
                        msgEl.innerText = `Nova versão atualizada com sucesso: ${event.data.version} 🚀`;
                        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
                        toast.show();
                    }
                }
            }
        });
    }
});