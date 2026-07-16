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

        // Estado do Vai-e-Vem Rápido
        this.quickReturnTarget = null; // Guarda se estamos indo para 'LITURGIA' ou 'MISSA'
        this.isViewingTarget = false;  // true = Vendo a missa | false = Vendo a música

        this.chordNodes = [];
        this.currentChordIndex = -1;

        backupManager.onImportComplete = () => this.refreshSelectOptions();

        this.initEvents();
        this.refreshSelectOptions();
        this.changeContext('ACORDES');
    }

    changeContext(newContext) {
        sessionStorage.setItem('app_context', newContext);
        const savedKey = sessionStorage.getItem(`key_${newContext}`) || "0";
        const keySelect = document.getElementById('key-select');
        if (keySelect && keySelect.value !== savedKey) {
            keySelect.value = savedKey;
            keySelect.dispatchEvent(new Event('change'));
        }
    }

    initEvents() {
        const btnMenu = document.getElementById('btn-main-menu');
        const tsWrapper = document.getElementById('wrapper-song-select');
        const panelAcordes = document.getElementById('chord-degrees-panel');
        const btnPrevChord = document.getElementById('btn-prev-chord');
        const btnNextChord = document.getElementById('btn-next-chord');

        // 1. Clique no Menu (Voltar pra Missa ou Abrir Menu)
        btnMenu.addEventListener('click', () => {
            if (this.quickReturnTarget && !this.isViewingTarget) {
                // Clicou no Menu AZUL: Corre de volta pra Missa!
                this.showQuickReturnTarget();
            } else {
                // Abre o menu lateral normalmente
                const offcanvasEl = document.getElementById('sideMenu');
                bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).show();
            }
        });

        // 2. Clique no Select Disfarçado (Voltar pra Música)
        tsWrapper.addEventListener('click', (e) => {
            if (this.quickReturnTarget && this.isViewingTarget) {
                // Bloqueia a abertura do dropdown e volta pro Santo!
                e.preventDefault();
                e.stopPropagation();
                this.showSongFromQuickReturn();
            }
        });

        // Ouve o menu (Liturgia e Missa)
        document.getElementById('btn-liturgy')?.addEventListener('click', (e) => {
            e.preventDefault();
            bootstrap.Offcanvas.getInstance(document.getElementById('sideMenu'))?.hide();
            this.activateQuickReturn('LITURGIA');
        });

        document.getElementById('btn-santamissa')?.addEventListener('click', (e) => {
            e.preventDefault();
            bootstrap.Offcanvas.getInstance(document.getElementById('sideMenu'))?.hide();
            this.activateQuickReturn('MISSA');
        });

        // Ao selecionar algo de verdade no select
        this.ts.on('change', (selectedId) => {
            this.cancelQuickReturn();

            // ---> CORREÇÃO AQUI <---
            this.ts.blur(); // Tira o foco da caixa forçando o nome da música a aparecer

            if (selectedId === 'ACORDES' || !selectedId) {
                panelAcordes.classList.remove('d-none');
                btnPrevChord.classList.add('d-none');
                btnNextChord.classList.add('d-none');

                this.currentSongId = null;
                this.view.showRepertoire('');
                this.changeContext('ACORDES');
                this.ts.removeOption('ACORDES');
                this.ts.clear(true);
            } else {
                panelAcordes.classList.add('d-none');
                btnPrevChord.classList.remove('d-none');
                btnNextChord.classList.remove('d-none');

                this.currentSongId = selectedId;
                const song = this.db.getSongById(selectedId);
                this.view.showRepertoire(song ? song.content : '');
                this.changeContext('ACORDES');
                this.initHighlights();
                this.ts.addOption({ value: 'ACORDES', text: 'Acordes', isTop: 1 });
            }
        });

        this.ts.on('dropdown_open', () => {
            this.cancelQuickReturn();
            this.view.toggleInlineActions(false);
        });

        // Ações de CRUD
        this.view.btnToggle.addEventListener('click', (e) => { e.stopPropagation(); this.view.toggleInlineActions(true); });
        document.addEventListener('click', (e) => {
            const isAction = e.target.closest('#btn-action-add') || e.target.closest('#btn-action-edit') || e.target.closest('#btn-action-delete') || e.target.closest('#btn-action-toggle');
            if (!this.view.btnAdd.classList.contains('d-none') && !isAction) this.view.toggleInlineActions(false);
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

        // Lógica de Highlight
        btnPrevChord.addEventListener('click', () => this.navigateChord(-1));
        btnNextChord.addEventListener('click', () => this.navigateChord(1));
    }

    // ==========================================
    // MÁGICA DO VAI-E-VEM
    // ==========================================

    activateQuickReturn(target) {
        this.quickReturnTarget = target;
        // Se não tem música tocando, só vai pra tela pedida normalmente
        if (!this.currentSongId || this.currentSongId === 'ACORDES') {
            this.quickReturnTarget = null;
            this.forceShowTarget(target);
            return;
        }
        // Se tem música, arma a armadilha do vai e vem
        this.showQuickReturnTarget();
    }

    forceShowTarget(target) {
        this.changeContext(target);
        if (target === 'LITURGIA') {
            this.view.showLiturgy();
        } else {
            this.view.mainDisplay.classList.add('d-none');
            this.view.mainIframe.classList.remove('d-none');
            this.view.mainIframe.src = "./santamissa.html";
        }
    }

    showQuickReturnTarget() {
        this.isViewingTarget = true;
        this.forceShowTarget(this.quickReturnTarget);

        // UI: Menu Preto e Select Disfarçado
        document.getElementById('main-menu-icon').classList.remove('menu-teal');
        document.getElementById('wrapper-song-select').classList.add('ts-fake-button');
    }

    showSongFromQuickReturn() {
        this.isViewingTarget = false;

        document.getElementById('main-menu-icon').classList.add('menu-teal');
        document.getElementById('wrapper-song-select').classList.remove('ts-fake-button');

        const song = this.db.getSongById(this.currentSongId);
        this.view.showRepertoire(song ? song.content : '');
        this.changeContext('ACORDES');
        this.initHighlights();

        // ---> CORREÇÃO AQUI <---
        this.ts.blur(); // Remove qualquer foco que tenha ficado no botão
    }

    cancelQuickReturn() {
        this.quickReturnTarget = null;
        this.isViewingTarget = false;
        document.getElementById('main-menu-icon').classList.remove('menu-teal');
        document.getElementById('wrapper-song-select').classList.remove('ts-fake-button');
    }

    // ==========================================

    initHighlights() {
        this.chordNodes = Array.from(this.view.mainDisplay.querySelectorAll('b, strong'));
        this.currentChordIndex = -1;
        this.chordNodes.forEach(node => node.classList.remove('chord-highlight'));
    }

    navigateChord(direction) {
        if (!this.chordNodes || this.chordNodes.length === 0) return;

        if (this.currentChordIndex >= 0 && this.currentChordIndex < this.chordNodes.length) {
            this.chordNodes[this.currentChordIndex].classList.remove('chord-highlight');
        }

        this.currentChordIndex += direction;

        if (this.currentChordIndex < 0) this.currentChordIndex = 0;
        if (this.currentChordIndex >= this.chordNodes.length) this.currentChordIndex = this.chordNodes.length - 1;

        const targetNode = this.chordNodes[this.currentChordIndex];
        if (targetNode) {
            targetNode.classList.add('chord-highlight');
            targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    refreshSelectOptions() {
        this.ts.clear(true);
        this.ts.clearOptions();
        this.db.getSongs().forEach(song => this.ts.addOption({ value: song.id, text: song.title, isTop: 0 }));

        if (this.currentSongId && this.db.getSongById(this.currentSongId)) {
            this.ts.addOption({ value: 'ACORDES', text: 'Acordes', isTop: 1 });
            this.ts.setValue(this.currentSongId, true);
        } else {
            this.ts.clear(true);
        }
    }

    handleEditRequest(isNew) {
        this.currentMode = isNew ? 'add' : 'edit';
        if (!isNew && !this.currentSongId) {
            alert('Selecione uma música para editar primeiro.');
            this.currentMode = 'view';
            return;
        }

        document.getElementById('chord-degrees-panel').classList.add('d-none');
        document.getElementById('btn-prev-chord').classList.remove('d-none');
        document.getElementById('btn-next-chord').classList.remove('d-none');

        if (isNew) {
            this.currentSongId = null;
            this.ts.removeOption('ACORDES');
            this.ts.clear(true);
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
            this.initHighlights();
        });
    }
}

// INICIALIZAÇÃO PRINCIPAL DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {

    // Inicia o Logger o mais rápido possível para pegar todos os erros
    const loggerManager = new LoggerManager(APP_VERSION, APP_UPDATE_DATE);

    // 1. Bibliotecas e Banco
    const tomSelectInstance = new TomSelect("#song-select", {
        create: false,
        // 1. MÁGICA: Ordena primeiro pelo isTop (1 = topo), depois pelo alfabeto
        sortField: [
            { field: "isTop", direction: "desc" },
            { field: "text", direction: "asc" }
        ],
        placeholder: "Escolha a Música...",
        allowEmptyOption: false,
        render: {
            option: function (data, escape) {
                if (data.value === 'ACORDES') return `<div><span style="font-style: italic; color: #6c757d;">${escape(data.text)}</span></div>`;
                return `<div>${escape(data.text)}</div>`;
            },
            item: function (data, escape) {
                if (data.value === 'ACORDES') return `<div><span style="font-style: italic; color: #6c757d;">${escape(data.text)}</span></div>`;
                return `<div>${escape(data.text)}</div>`;
            }
        },
        onDropdownOpen: function () { this.control_input.placeholder = "🔍 Digite para pesquisar..."; },
        onDropdownClose: function () { this.control_input.placeholder = ""; }
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