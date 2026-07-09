/**
 * Gerencia a troca de tema (Claro / Escuro)
 */
class ThemeManager {
    constructor() {
        this.btnToggle = document.getElementById('btn-theme-toggle');
        this.iconTheme = document.getElementById('icon-theme');
        this.htmlElement = document.documentElement;
        this.init();
    }

    init() {
        const currentTheme = localStorage.getItem('theme');
        this.setTheme(currentTheme === 'dark');

        this.btnToggle.addEventListener('click', () => {
            const isCurrentlyDark = this.htmlElement.getAttribute('data-bs-theme') === 'dark';
            this.setTheme(!isCurrentlyDark);
        });
    }

    setTheme(isDark) {
        const theme = isDark ? 'dark' : 'light';
        this.htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);

        if (isDark) {
            this.iconTheme.classList.replace('bi-moon-fill', 'bi-sun-fill');
            this.iconTheme.style.color = "#ffc107";
        } else {
            this.iconTheme.classList.replace('bi-sun-fill', 'bi-moon-fill');
            this.iconTheme.style.color = "";
        }
    }
}

/**
 * Gerencia a troca de idioma importando os dados do arquivo JSON
 */
class LanguageManager {
    constructor(tomSelectInstance) {
        this.btnLangToggle = document.getElementById('btn-language-toggle');
        this.iconFlag = document.getElementById('icon-flag');
        this.tomSelectInstance = tomSelectInstance;

        const systemLang = navigator.language || navigator.userLanguage;
        this.currentLang = systemLang.startsWith('en') ? 'en' : 'pt';
        this.translations = {};

        this.loadTranslations();
    }

    async loadTranslations() {
        try {
            const response = await fetch('translations.json');

            if (!response.ok) {
                throw new Error('Falha no carregamento do arquivo JSON');
            }

            this.translations = await response.json();
            this.init();
        } catch (error) {
            console.error("Aviso: Falha ao carregar as traduções.", error);
        }
    }

    init() {
        this.btnLangToggle.addEventListener('click', () => {
            if (this.currentLang === 'pt') {
                this.currentLang = 'en';
            } else {
                this.currentLang = 'pt';
            }
            this.updateInterface();
        });

        this.updateInterface();
    }

    updateInterface() {
        const dict = this.getDict();
        if (!dict) return;

        // Atualiza a bandeira
        this.iconFlag.innerText = this.currentLang === 'pt' ? '🇧🇷' : '🇺🇸';

        // Atualiza elementos com data-i18n (textos normais)
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerText = dict[key];
            }
        });

        // Atualiza elementos com data-i18n-placeholder (inputs)
        const i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]');
        i18nPlaceholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) {
                el.placeholder = dict[key];
            }
        });

        // Atualiza o select de músicas
        if (this.tomSelectInstance) {
            this.tomSelectInstance.settings.placeholder = dict.chooseSong;
            this.tomSelectInstance.control_input.placeholder = dict.chooseSong;
        }
    }

    getDict() {
        return this.translations[this.currentLang] || {};
    }
}

/**
 * Classe utilitária para chamar Modais dinâmicos
 */
class ModalManager {
    constructor(languageManager) {
        this.langManager = languageManager;

        this.modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        this.titleEl = document.getElementById('confirmModalTitle');
        this.bodyEl = document.getElementById('confirmModalBody');

        this.btnNo = document.getElementById('btn-confirm-no');
        this.btnYes = document.getElementById('btn-confirm-yes');
    }

    show(titleKey, bodyKey, onConfirmCallback, showCancelButton = true) {
        const dict = this.langManager.getDict();

        this.titleEl.innerText = dict[titleKey] || titleKey;
        this.bodyEl.innerText = dict[bodyKey] || bodyKey;
        this.btnNo.innerText = dict['no'] || 'Não';

        if (showCancelButton) {
            this.btnNo.classList.remove('d-none');
            this.btnYes.innerText = dict['yes'] || 'Sim';
        } else {
            this.btnNo.classList.add('d-none');
            this.btnYes.innerText = 'OK';
        }

        // Remove listeners antigos do botão clonando-o (evita cliques múltiplos)
        const newBtnYes = this.btnYes.cloneNode(true);
        this.btnYes.parentNode.replaceChild(newBtnYes, this.btnYes);
        this.btnYes = newBtnYes;

        this.btnYes.addEventListener('click', () => {
            this.modal.hide();
            if (onConfirmCallback) {
                onConfirmCallback();
            }
        });

        this.modal.show();
    }
}

/**
 * Abstração pura de Banco de Dados Local
 */
class DatabaseManager {
    constructor() {
        this.STORAGE_KEY = 'songs';
    }

    getSongs() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return [];
    }

    saveSongs(songs) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(songs));
    }

    addSong(title, content) {
        const songs = this.getSongs();
        const newSong = { id: Date.now().toString(), title, content };

        songs.push(newSong);
        this.saveSongs(songs);

        return newSong;
    }

    updateSong(id, title, content) {
        const songs = this.getSongs();
        const index = songs.findIndex(s => s.id === id);

        if (index > -1) {
            songs[index] = { ...songs[index], title, content };
            this.saveSongs(songs);
            return songs[index];
        }

        return null;
    }

    deleteSong(id) {
        let songs = this.getSongs();
        songs = songs.filter(s => s.id !== id);
        this.saveSongs(songs);
    }

    getSongById(id) {
        const songs = this.getSongs();
        return songs.find(s => s.id === id);
    }
}

/**
 * Controla as Telas Principais (Cifra/Partitura, Liturgia, Modo de Edição)
 */
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

        this.initPasteHandling();
    }

    /** 
     * Intercepta a "colagem" e remove a formatação HTML, deixando apenas plain text.
     * Isso garante que bibliotecas como VexFlow não quebrem ao processar as notações no futuro.
     */
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

        this.toggleEditTopBar(false);
    }

    enterEditMode(title = '', content = '') {
        this.mainIframe.classList.add('d-none');
        this.mainDisplay.classList.remove('d-none');
        this.mainDisplay.setAttribute('contenteditable', 'true');
        this.mainDisplay.innerHTML = content;
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
        } else {
            this.inputTitle.classList.add('d-none');
            this.wrapperSelect.classList.remove('d-none');

            this.btnSave.classList.add('d-none');
            this.btnCancel.classList.add('d-none');

            this.btnToggle.classList.remove('d-none');
            this.btnAdd.classList.add('d-none');
            this.btnEdit.classList.add('d-none');
            this.btnDelete.classList.add('d-none');
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
            content: this.mainDisplay.innerHTML
        };
    }
}

/**
 * Gerencia a lógica dos botões de BPM (Soma, Subtrai, Valida limites)
 */
class BpmManager {
    constructor() {
        this.input = document.getElementById('bpm-input');

        this.btnMinus5 = document.getElementById('btn-bpm-minus-5');
        this.btnMinus1 = document.getElementById('btn-bpm-minus-1');
        this.btnPlus1 = document.getElementById('btn-bpm-plus-1');
        this.btnPlus5 = document.getElementById('btn-bpm-plus-5');

        this.init();
    }

    init() {
        if (!this.input) return;

        this.btnMinus5.addEventListener('click', () => this.changeBpm(-5));
        this.btnMinus1.addEventListener('click', () => this.changeBpm(-1));
        this.btnPlus1.addEventListener('click', () => this.changeBpm(1));
        this.btnPlus5.addEventListener('click', () => this.changeBpm(5));

        // Validação quando o usuário digita manualmente e tira o foco
        this.input.addEventListener('change', () => {
            let value = parseInt(this.input.value, 10);

            if (isNaN(value) || value < 30) {
                value = 30;
            } else if (value > 300) {
                value = 300;
            }

            this.input.value = value;
        });
    }

    changeBpm(amount) {
        let currentValue = parseInt(this.input.value, 10);

        if (isNaN(currentValue)) {
            currentValue = 90;
        }

        let newValue = currentValue + amount;

        if (newValue < 30) {
            newValue = 30;
        } else if (newValue > 300) {
            newValue = 300;
        }

        this.input.value = newValue;
    }
}

/**
 * Controlador de Exportação / Importação (Arquivos JSON)
 */
class BackupManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.onImportComplete = null;

        this.initExport();
        this.initImport();
    }

    initExport() {
        const modalEl = document.getElementById('exportModal');
        const exportList = document.getElementById('export-list');
        const exportSelectAll = document.getElementById('export-select-all');
        const btnConfirm = document.getElementById('btn-confirm-export');

        // Sempre que o modal abrir, monta a lista de opções na tela
        modalEl.addEventListener('show.bs.modal', () => {
            exportList.innerHTML = '';

            const songs = this.db.getSongs();
            songs.forEach(song => {
                exportList.innerHTML += `
                    <div class="form-check">
                        <input class="form-check-input export-cb" type="checkbox" value="${song.id}" checked>
                        <label class="form-check-label">${song.title}</label>
                    </div>`;
            });

            exportSelectAll.checked = true;
        });

        // Toggle para selecionar/desmarcar tudo
        exportSelectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.export-cb');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });

        // Ação de download
        btnConfirm.addEventListener('click', () => {
            const checkedElements = Array.from(document.querySelectorAll('.export-cb:checked'));
            const selectedIds = checkedElements.map(cb => cb.value);

            const allSongs = this.db.getSongs();
            const songsToExport = allSongs.filter(song => selectedIds.includes(song.id));

            const blob = new Blob([JSON.stringify(songsToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `repertorio_${new Date().toISOString().split('T')[0]}.json`;
            anchor.click();

            URL.revokeObjectURL(url);
            bootstrap.Modal.getInstance(modalEl).hide();
        });
    }

    initImport() {
        const modalEl = document.getElementById('importModal');
        const fileInput = document.getElementById('import-file-input');
        const selectionArea = document.getElementById('import-selection-area');
        const importList = document.getElementById('import-list');
        const selectAll = document.getElementById('import-select-all');
        const btnConfirm = document.getElementById('btn-confirm-import');

        let loadedImportSongs = [];

        // Limpa os dados se o modal for fechado sem finalizar
        modalEl.addEventListener('hidden.bs.modal', () => {
            fileInput.value = '';
            selectionArea.classList.add('d-none');
            btnConfirm.classList.add('d-none');
            loadedImportSongs = [];
        });

        // Dispara quando o usuário escolhe um arquivo do computador
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    loadedImportSongs = JSON.parse(event.target.result);
                    importList.innerHTML = '';

                    loadedImportSongs.forEach((song, index) => {
                        importList.innerHTML += `
                            <div class="form-check">
                                <input class="form-check-input import-cb" type="checkbox" value="${index}" checked>
                                <label class="form-check-label">${song.title}</label>
                            </div>`;
                    });

                    selectionArea.classList.remove('d-none');
                    btnConfirm.classList.remove('d-none');
                    selectAll.checked = true;

                } catch (err) {
                    alert('Arquivo JSON inválido.');
                }
            };

            reader.readAsText(file);
        });

        selectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.import-cb');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });

        btnConfirm.addEventListener('click', () => {
            const checkedElements = Array.from(document.querySelectorAll('.import-cb:checked'));
            const selectedIndexes = checkedElements.map(cb => parseInt(cb.value, 10));

            const songsToImport = loadedImportSongs.filter((song, index) => selectedIndexes.includes(index));
            const currentSongs = this.db.getSongs();

            songsToImport.forEach(song => {
                // Gera um ID novo e seguro para cada música importada
                song.id = Date.now().toString() + Math.random().toString().substring(2, 5);
                currentSongs.push(song);
            });

            this.db.saveSongs(currentSongs);

            if (this.onImportComplete) {
                this.onImportComplete();
            }

            bootstrap.Modal.getInstance(modalEl).hide();
            alert(`${songsToImport.length} música(s) importada(s) com sucesso!`);
        });
    }
}

/**
 * Controller Central: Une o Banco de Dados, Views, Modais e TomSelect
 */
class RepertoireController {
    constructor(ts, dbManager, viewManager, modalManager, backupManager) {
        this.ts = ts;
        this.db = dbManager;
        this.view = viewManager;
        this.modal = modalManager;

        this.currentMode = 'view'; // 'view', 'add', 'edit'
        this.currentSongId = null;

        backupManager.onImportComplete = () => this.refreshSelectOptions();

        this.initEvents();
        this.refreshSelectOptions();
    }

    initEvents() {
        // Quando o usuário seleciona uma música na lista
        this.ts.on('change', (selectedId) => {
            this.currentSongId = selectedId;
            if (selectedId || selectedId === '') {
                const song = this.db.getSongById(selectedId);
                this.view.showRepertoire(song ? song.content : '');
            }
        });

        // Quando o usuário abre o dropdown, queremos ter certeza de esconder os botões de ação
        this.ts.on('dropdown_open', () => {
            this.view.toggleInlineActions(false);
        });

        // Exibir ações (Adicionar, Editar, Excluir)
        this.view.btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.view.toggleInlineActions(true);
        });

        // Esconder ações caso clique fora
        document.addEventListener('click', (e) => {
            const isAdd = e.target.closest('#btn-action-add');
            const isEdit = e.target.closest('#btn-action-edit');
            const isDelete = e.target.closest('#btn-action-delete');
            const isToggle = e.target.closest('#btn-action-toggle');

            const actionsAreVisible = !this.view.btnAdd.classList.contains('d-none');

            if (actionsAreVisible && !isAdd && !isEdit && !isDelete && !isToggle) {
                this.view.toggleInlineActions(false);
            }
        });

        // Botões de Ação
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

        const allSongs = this.db.getSongs();
        allSongs.forEach(song => {
            this.ts.addOption({ value: song.id, text: song.title });
        });

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

        if (!title) {
            alert('O título da música não pode estar vazio!');
            return;
        }

        const allSongs = this.db.getSongs();
        const isDuplicate = allSongs.some(song => {
            const hasSameName = song.title.toLowerCase() === title.toLowerCase();
            const isNotTheCurrentSong = song.id !== this.currentSongId;
            return hasSameName && isNotTheCurrentSong;
        });

        if (isDuplicate) {
            this.modal.show('duplicateTitle', 'duplicateBody', null, false);
            return;
        }

        this.modal.show('confirmSaveTitle', 'confirmSaveBody', () => {
            if (this.currentMode === 'add') {
                const newSong = this.db.addSong(title, content);
                this.currentSongId = newSong.id;
            } else {
                this.db.updateSong(this.currentSongId, title, content);
            }

            this.currentMode = 'view';
            this.refreshSelectOptions();
            this.ts.setValue(this.currentSongId, true);
        });
    }
}

/**
 * Gerencia a abertura da Liturgia Diária
 */
class LiturgyManager {
    constructor(ts, viewManager) {
        this.btnLiturgy = document.getElementById('btn-liturgy');
        this.ts = ts;
        this.view = viewManager;
        this.init();
    }

    init() {
        if (!this.btnLiturgy) return;

        this.btnLiturgy.addEventListener('click', (e) => {
            e.preventDefault();

            // Fecha o Offcanvas de maneira limpa
            const offcanvasEl = document.getElementById('sideMenu');
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasEl);
            if (offcanvasInstance) {
                offcanvasInstance.hide();
            }

            // Limpa a seleção do Dropdown (deixa vazio) e exibe o iframe
            this.ts.setValue('', true);
            this.view.showLiturgy();
        });
    }
}

class PlaybackManager {
    constructor() {
        this.btnPlay = document.getElementById('btn-play');
        this.iconPlay = document.getElementById('icon-play');
        this.isPlaying = false;
        this.onStopCallback = null;

        this.btnPlay.addEventListener('click', () => this.setPlayState(!this.isPlaying));
    }

    onStop(callback) {
        this.onStopCallback = callback;
    }

    setPlayState(state) {
        this.isPlaying = state;
        if (this.isPlaying) {
            this.btnPlay.classList.add('playing');
            this.iconPlay.classList.replace('fa-play', 'fa-stop');
        } else {
            this.btnPlay.classList.remove('playing');
            this.iconPlay.classList.replace('fa-stop', 'fa-play');

            if (this.onStopCallback) {
                this.onStopCallback();
            }
        }
    }
}

class NotePhaseManager {
    constructor() {
        this.btnMusic = document.getElementById('btn-music');
        this.iconMusic = document.getElementById('icon-music');
        this.musicPhase = 1;

        this.btnMusic.addEventListener('click', () => {
            this.musicPhase = (this.musicPhase % 3) + 1;

            this.btnMusic.classList.remove('phase-3');
            this.iconMusic.className = '';
            this.iconMusic.innerText = '';

            if (this.musicPhase === 1) {
                this.iconMusic.className = 'bi bi-music-note';
            } else if (this.musicPhase === 2) {
                this.iconMusic.className = 'bi bi-music-note-beamed';
            } else if (this.musicPhase === 3) {
                this.btnMusic.classList.add('phase-3');
                this.iconMusic.className = 'music-emoji';
                this.iconMusic.innerText = '🎶';
            }
        });
    }
}

class ChordManager {
    constructor(playbackManager) {
        this.playbackManager = playbackManager;
        this.chordBtns = document.querySelectorAll('.chord-btn');
        this.keySelect = document.getElementById('key-select');
        this.btnKeyDown = document.getElementById('btn-key-down');
        this.btnKeyUp = document.getElementById('btn-key-up');

        this.notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

        this.init();
    }

    init() {
        this.playbackManager.onStop(() => this.clearActiveChords());

        this.chordBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleChordClick(btn));
        });

        this.keySelect.addEventListener('change', (e) => {
            this.transposeChords(parseInt(e.target.value, 10));
        });

        this.btnKeyDown.addEventListener('click', () => this.changeKeyStep(-1));
        this.btnKeyUp.addEventListener('click', () => this.changeKeyStep(1));
    }

    handleChordClick(btn) {
        if (btn.classList.contains('active')) {
            // Reinicia a animação caso clique de novo em um botão já ativo
            btn.classList.remove('repress-anim');
            void btn.offsetWidth; // Gatilho de Reflow para forçar a animação
            btn.classList.add('repress-anim');
        } else {
            this.clearActiveChords();
            btn.classList.add('active');

            if (!this.playbackManager.isPlaying) {
                this.playbackManager.setPlayState(true);
            }
        }
    }

    clearActiveChords() {
        this.chordBtns.forEach(b => {
            b.classList.remove('active');
            b.classList.remove('repress-anim');
        });
    }

    changeKeyStep(step) {
        const currentValue = parseInt(this.keySelect.value, 10);
        const newOffset = (currentValue + step + 12) % 12;

        this.keySelect.value = newOffset;
        this.transposeChords(newOffset);
    }

    transposeChords(keyOffset) {
        const selectedText = this.keySelect.options[this.keySelect.selectedIndex].text;
        const useFlats = selectedText.includes('b') || this.keySelect.value === '5'; // 5 é Fá
        const currentScale = useFlats ? this.notesFlat : this.notesSharp;

        this.chordBtns.forEach(btn => {
            const baseInterval = parseInt(btn.getAttribute('data-interval'), 10);
            const chordType = btn.getAttribute('data-type');

            const newIndex = (baseInterval + keyOffset) % 12;
            const newNote = currentScale[newIndex];

            btn.innerText = `${newNote}${chordType}`;
        });
    }
}

class PianoManager {
    constructor() {
        this.container = document.getElementById('piano-container');
        this.shadowLeft = document.querySelector('.scroll-shadow-left');
        this.shadowRight = document.querySelector('.scroll-shadow-right');

        this.isDown = false;
        this.isDragging = false;
        this.startX = 0;
        this.scrollLeft = 0;
        this.activeKey = null;

        this.renderKeys();
        this.initEvents();
    }

    renderKeys() {
        const piano = document.getElementById('piano');
        if (!piano) return;

        piano.innerHTML = '';

        const octaves = [3, 4, 5];
        const pattern = [
            { note: 'C', type: 'white' }, { note: 'C#', type: 'black' },
            { note: 'D', type: 'white' }, { note: 'D#', type: 'black' },
            { note: 'E', type: 'white' }, { note: 'F', type: 'white' },
            { note: 'F#', type: 'black' }, { note: 'G', type: 'white' },
            { note: 'G#', type: 'black' }, { note: 'A', type: 'white' },
            { note: 'A#', type: 'black' }, { note: 'B', type: 'white' }
        ];

        octaves.forEach(octave => {
            pattern.forEach(n => {
                const key = document.createElement('div');
                key.className = `key ${n.type}`;
                key.innerHTML = `<span>${n.note}${octave}</span>`;
                piano.appendChild(key);
            });
        });

        // Adiciona a nota final C6 para fechar o teclado lindamente
        const keyC6 = document.createElement('div');
        keyC6.className = 'key white';
        keyC6.innerHTML = '<span>C6</span>';
        piano.appendChild(keyC6);
    }

    initEvents() {
        if (!this.container) return;

        this.container.addEventListener('scroll', () => this.updateShadows());
        window.addEventListener('resize', () => this.updateShadows());
        setTimeout(() => this.updateShadows(), 100);

        this.container.addEventListener('mousedown', (e) => this.downAction(e.pageX, e.target));
        this.container.addEventListener('mousemove', (e) => this.moveAction(e.pageX));
        window.addEventListener('mouseup', () => this.upAction());

        this.container.addEventListener('touchstart', (e) => {
            this.downAction(e.touches[0].pageX, e.target);
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            this.moveAction(e.touches[0].pageX);
        }, { passive: true });

        window.addEventListener('touchend', () => this.upAction());
    }

    downAction(pageX, target) {
        this.isDown = true;
        this.isDragging = false;

        this.startX = pageX - this.container.offsetLeft;
        this.scrollLeft = this.container.scrollLeft;

        const key = target.closest('.key');
        if (key) {
            this.activeKey = key;
            key.classList.add('pressed');
        }
    }

    moveAction(pageX) {
        if (!this.isDown) return;

        const walk = (pageX - this.container.offsetLeft - this.startX);

        if (Math.abs(walk) > 5) {
            this.isDragging = true;
            this.container.scrollLeft = this.scrollLeft - walk;

            if (this.activeKey) {
                this.activeKey.classList.remove('pressed');
            }
        }
    }

    upAction() {
        this.isDown = false;
        if (this.activeKey) {
            this.activeKey.classList.remove('pressed');
            this.activeKey = null;
        }
    }

    updateShadows() {
        const maxScroll = this.container.scrollWidth - this.container.clientWidth;
        const currentScroll = this.container.scrollLeft;

        if (currentScroll > 0) {
            this.shadowLeft.classList.remove('d-none');
        } else {
            this.shadowLeft.classList.add('d-none');
        }

        if (currentScroll < maxScroll - 1 && maxScroll > 0) {
            this.shadowRight.classList.remove('d-none');
        } else {
            this.shadowRight.classList.add('d-none');
        }
    }
}

/**
 * Inicialização Principal (Injeção de Dependências)
 */
document.addEventListener('DOMContentLoaded', () => {

    const tomSelectInstance = new TomSelect("#song-select", {
        create: false,
        sortField: { field: "text", direction: "asc" },
        placeholder: "Escolha a Música...",
        allowEmptyOption: false
    });

    const dbManager = new DatabaseManager();
    const viewManager = new ViewManager();
    const themeManager = new ThemeManager();
    const languageManager = new LanguageManager(tomSelectInstance);
    const modalManager = new ModalManager(languageManager);
    const backupManager = new BackupManager(dbManager);

    // Core Controllers
    const repertoireController = new RepertoireController(tomSelectInstance, dbManager, viewManager, modalManager, backupManager);
    const liturgyManager = new LiturgyManager(tomSelectInstance, viewManager);

    // Component Controllers
    const bpmManager = new BpmManager();
    const playbackManager = new PlaybackManager();
    const notePhaseManager = new NotePhaseManager();
    const chordManager = new ChordManager(playbackManager);
    const pianoManager = new PianoManager();
});