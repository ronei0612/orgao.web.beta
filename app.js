/**
 * Gerencia a troca de tema (Claro / Escuro)
 */
class ThemeManager {
    constructor() {
        this.btnToggle = document.getElementById('btn-theme-toggle');
        this.iconTheme = document.getElementById('icon-theme');
        this.htmlElement = document.documentElement;
        this.isDark = false;
        this.init();
    }

    init() {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            this.setTheme(true);
        }

        this.btnToggle.addEventListener('click', () => {
            this.setTheme(!this.isDark);
        });
    }

    setTheme(isDark) {
        this.isDark = isDark;
        const theme = this.isDark ? 'dark' : 'light';
        this.htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);

        if (this.isDark) {
            this.iconTheme.classList.replace('bi-moon-fill', 'bi-sun-fill');
            this.iconTheme.style.color = "#ffc107";
        } else {
            this.iconTheme.classList.replace('bi-sun-fill', 'bi-moon-fill');
            this.iconTheme.style.color = "";
        }
    }
}

/**
 * Gerencia a troca de idioma e os dicionários
 */
class LanguageManager {
    constructor(tomSelectInstance) {
        this.btnLangToggle = document.getElementById('btn-language-toggle');
        this.iconFlag = document.getElementById('icon-flag');
        this.tomSelectInstance = tomSelectInstance;

        const systemLang = navigator.language || navigator.userLanguage;
        this.currentLang = systemLang.startsWith('pt') ? 'pt' : 'en';

        this.translations = {
            en: {
                settingsTitle: "Settings",
                settingsDesc: "Adjust application preferences.",
                chooseSong: "Choose a Song...",
                noRhythm: "No rhythm",
                organ: "ORGAN",
                downloadRepertoire: "Download my Repertoire",
                importRepertoire: "Import a Repertoire",
                exportTitle: "Export Repertoire",
                importTitle: "Import Repertoire",
                selectAll: "Select All",
                cancel: "Cancel",
                songTitlePlaceholder: "Song title...",
                confirmSaveTitle: "Save Song",
                confirmSaveBody: "Are you sure you want to save this song?",
                confirmCancelTitle: "Cancel Changes",
                confirmCancelBody: "Are you sure you want to cancel? Unsaved changes will be lost.",
                confirmDeleteTitle: "Delete Song",
                confirmDeleteBody: "Are you sure you want to delete this song?",
                duplicateTitle: "Duplicate Title",
                duplicateBody: "A song with this title already exists. Please choose a unique title.",
                yes: "Yes",
                no: "No"
            },
            pt: {
                settingsTitle: "Configurações",
                settingsDesc: "Ajuste as preferências do aplicativo.",
                chooseSong: "Escolha a Música...",
                noRhythm: "Sem ritmo",
                organ: "ÓRGÃO",
                downloadRepertoire: "Baixar meu Repertório",
                importRepertoire: "Importar um Repertório",
                exportTitle: "Exportar Repertório",
                importTitle: "Importar Repertório",
                selectAll: "Selecionar Tudo",
                cancel: "Cancelar",
                songTitlePlaceholder: "Título da música...",
                confirmSaveTitle: "Salvar Música",
                confirmSaveBody: "Tem certeza de que deseja salvar esta música?",
                confirmCancelTitle: "Cancelar Alterações",
                confirmCancelBody: "Tem certeza de que deseja cancelar? Todas as alterações não salvas serão perdidas.",
                confirmDeleteTitle: "Excluir Música",
                confirmDeleteBody: "Tem certeza de que deseja excluir esta música?",
                duplicateTitle: "Título Duplicado",
                duplicateBody: "Uma música com este título já existe. Por favor, escolha um título único.",
                yes: "Sim",
                no: "Não"
            }
        };

        this.init();
    }

    init() {
        this.btnLangToggle.addEventListener('click', () => {
            this.currentLang = this.currentLang === 'en' ? 'pt' : 'en';
            this.updateInterface();
        });
        this.updateInterface();
    }

    updateInterface() {
        this.iconFlag.innerText = this.currentLang === 'en' ? '🇺🇸' : '🇧🇷';
        const dict = this.translations[this.currentLang];

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerText = dict[key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.placeholder = dict[key];
        });

        // Atualiza nativamente o texto do TomSelect para não mostrar lixo na interface
        if (this.tomSelectInstance) {
            this.tomSelectInstance.settings.placeholder = dict.chooseSong;
            this.tomSelectInstance.control_input.placeholder = dict.chooseSong;

            // Força a renderização do placeholder se nenhum item estiver selecionado
            if (!this.tomSelectInstance.getValue()) {
                this.tomSelectInstance.clear(true);
            }
        }
    }
}

/**
 * Gerencia o Repertório (Persistência, Edição Inline, Modais de Confirmação, Segurança e Auto-Encolhimento)
 */
class RepertoireManager {
    constructor(tomSelectInstance, languageManager) {
        this.ts = tomSelectInstance;
        this.langManager = languageManager;
        this.STORAGE_KEY = 'songs';
        this.songs = this.loadSongs();

        // Estado
        this.currentMode = 'view'; // view, add, edit
        this.currentSongId = null;

        // Modal do Bootstrap para Confirmação
        this.confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

        // Elementos DOM
        this.wrapperSelect = document.getElementById('wrapper-song-select');
        this.inputTitle = document.getElementById('song-title-input');
        this.mainDisplay = document.getElementById('main-display');

        // Elementos de Ação
        this.btnToggle = document.getElementById('btn-action-toggle');
        this.btnAdd = document.getElementById('btn-action-add');
        this.btnEdit = document.getElementById('btn-action-edit');
        this.btnDelete = document.getElementById('btn-action-delete');

        this.btnSave = document.getElementById('btn-action-save');
        this.btnCancel = document.getElementById('btn-action-cancel');

        this.init();
        this.initExportImport();
    }

    loadSongs() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) return JSON.parse(data);
        return []; // Inicia vazio e limpo
    }

    saveToStorage() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.songs));
    }

    init() {
        this.updateSelectOptions();

        this.ts.on('change', (val) => {
            this.currentSongId = val;
            const song = this.songs.find(s => s.id === val);
            this.mainDisplay.innerHTML = song ? song.content : '';
        });

        // Alterna entre botão "+" e as opções CRUD Inline
        this.btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleInlineActions(true);
        });

        // Evento Global: Encolhe as opções ao clicar fora delas
        document.addEventListener('click', (e) => {
            if (!this.btnAdd.classList.contains('d-none')) {
                const clickedAnAction = e.target.closest('#btn-action-add') ||
                    e.target.closest('#btn-action-edit') ||
                    e.target.closest('#btn-action-delete');
                if (!clickedAnAction) {
                    this.toggleInlineActions(false);
                }
            }
        });

        // Ações CRUD
        this.btnAdd.addEventListener('click', () => this.enterEditMode(true));
        this.btnEdit.addEventListener('click', () => this.enterEditMode(false));
        this.btnDelete.addEventListener('click', () => {
            this.showCustomModal('confirmDeleteTitle', 'confirmDeleteBody', () => this.deleteSong());
        });

        // Salvar / Cancelar com modais
        this.btnSave.addEventListener('click', () => {
            const title = this.inputTitle.value.trim();
            if (!title) {
                alert('O título da música não pode estar vazio!');
                return;
            }

            // Segurança: impede duplicação
            const isDuplicate = this.songs.some(s => s.title.toLowerCase() === title.toLowerCase() && s.id !== this.currentSongId);
            if (isDuplicate) {
                this.showCustomModal('duplicateTitle', 'duplicateBody', null, false);
                return;
            }

            this.showCustomModal('confirmSaveTitle', 'confirmSaveBody', () => this.saveSong());
        });

        this.btnCancel.addEventListener('click', () => {
            this.showCustomModal('confirmCancelTitle', 'confirmCancelBody', () => this.exitEditMode());
        });
    }

    showCustomModal(titleKey, bodyKey, onConfirm, showCancel = true) {
        const lang = this.langManager.currentLang;
        const dict = this.langManager.translations[lang];

        document.getElementById('confirmModalTitle').innerText = dict[titleKey] || titleKey;
        document.getElementById('confirmModalBody').innerText = dict[bodyKey] || bodyKey;

        const btnNo = document.getElementById('btn-confirm-no');
        const btnYes = document.getElementById('btn-confirm-yes');

        btnNo.innerText = dict['no'] || 'No';

        if (showCancel) {
            btnNo.classList.remove('d-none');
            btnYes.innerText = dict['yes'] || 'Yes';
        } else {
            btnNo.classList.add('d-none');
            btnYes.innerText = 'OK';
        }

        const newBtnYes = btnYes.cloneNode(true);
        btnYes.parentNode.replaceChild(newBtnYes, btnYes);

        newBtnYes.addEventListener('click', () => {
            this.confirmModal.hide();
            if (onConfirm) onConfirm();
        });

        this.confirmModal.show();
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

    updateSelectOptions() {
        this.ts.clear(true); // silent clear
        this.ts.clearOptions();
        this.songs.forEach(s => this.ts.addOption({ value: s.id, text: s.title }));

        // Restaura a seleção se houver um id válido
        if (this.currentSongId && this.songs.some(s => s.id === this.currentSongId)) {
            this.ts.setValue(this.currentSongId, true);
        }
    }

    enterEditMode(isNew) {
        this.currentMode = isNew ? 'add' : 'edit';

        if (!isNew && !this.currentSongId) {
            alert('Selecione uma música para editar primeiro.');
            return;
        }

        this.wrapperSelect.classList.add('d-none');
        this.inputTitle.classList.remove('d-none');

        this.toggleInlineActions(false);
        this.btnToggle.classList.add('d-none');

        this.btnSave.classList.remove('d-none');
        this.btnCancel.classList.remove('d-none');

        this.mainDisplay.setAttribute('contenteditable', 'true');
        this.mainDisplay.focus();

        if (isNew) {
            this.inputTitle.value = '';
            this.mainDisplay.innerHTML = '';
            this.currentSongId = null;
        } else {
            const song = this.songs.find(s => s.id === this.currentSongId);
            this.inputTitle.value = song.title;
        }
    }

    exitEditMode() {
        this.currentMode = 'view';

        this.inputTitle.classList.add('d-none');
        this.wrapperSelect.classList.remove('d-none');

        this.btnSave.classList.add('d-none');
        this.btnCancel.classList.add('d-none');
        this.btnToggle.classList.remove('d-none');

        this.mainDisplay.setAttribute('contenteditable', 'false');

        const song = this.songs.find(s => s.id === this.currentSongId);
        this.mainDisplay.innerHTML = song ? song.content : '';
    }

    saveSong() {
        const title = this.inputTitle.value.trim();
        const content = this.mainDisplay.innerHTML;

        if (this.currentMode === 'add') {
            const newId = Date.now().toString();
            this.songs.push({ id: newId, title, content });
            this.currentSongId = newId;
            this.ts.addOption({ value: newId, text: title }); // Atualização individual rápida
        } else if (this.currentMode === 'edit') {
            const index = this.songs.findIndex(s => s.id === this.currentSongId);
            if (index > -1) {
                this.songs[index] = { ...this.songs[index], title, content };
                this.ts.updateOption(this.currentSongId, { value: this.currentSongId, text: title }); // Atualização instantânea sem glitch visual
            }
        }

        this.saveToStorage();
        this.ts.setValue(this.currentSongId, true);
        this.exitEditMode();
    }

    deleteSong() {
        if (!this.currentSongId) return;
        this.songs = this.songs.filter(s => s.id !== this.currentSongId);
        this.saveToStorage();
        this.currentSongId = null;

        this.updateSelectOptions();
        this.ts.setValue('');
        this.mainDisplay.innerHTML = '';
        this.toggleInlineActions(false);
    }

    initExportImport() {
        const exportModal = document.getElementById('exportModal');
        const exportList = document.getElementById('export-list');
        const exportSelectAll = document.getElementById('export-select-all');
        const btnConfirmExport = document.getElementById('btn-confirm-export');

        exportModal.addEventListener('show.bs.modal', () => {
            exportList.innerHTML = '';
            this.songs.forEach(s => {
                exportList.innerHTML += `
                    <div class="form-check">
                        <input class="form-check-input export-cb" type="checkbox" value="${s.id}" checked>
                        <label class="form-check-label">${s.title}</label>
                    </div>`;
            });
            exportSelectAll.checked = true;
        });

        exportSelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.export-cb').forEach(cb => cb.checked = e.target.checked);
        });

        btnConfirmExport.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.export-cb:checked')).map(cb => cb.value);
            const toExport = this.songs.filter(s => selectedIds.includes(s.id));

            const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `repertorio_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            bootstrap.Modal.getInstance(exportModal).hide();
        });

        const importModal = document.getElementById('importModal');
        const importFileInput = document.getElementById('import-file-input');
        const importSelectionArea = document.getElementById('import-selection-area');
        const importList = document.getElementById('import-list');
        const importSelectAll = document.getElementById('import-select-all');
        const btnConfirmImport = document.getElementById('btn-confirm-import');

        let loadedImportSongs = [];

        importModal.addEventListener('hidden.bs.modal', () => {
            importFileInput.value = '';
            importSelectionArea.classList.add('d-none');
            btnConfirmImport.classList.add('d-none');
            loadedImportSongs = [];
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    loadedImportSongs = JSON.parse(event.target.result);
                    importList.innerHTML = '';
                    loadedImportSongs.forEach((s, idx) => {
                        importList.innerHTML += `
                            <div class="form-check">
                                <input class="form-check-input import-cb" type="checkbox" value="${idx}" checked>
                                <label class="form-check-label">${s.title}</label>
                            </div>`;
                    });
                    importSelectionArea.classList.remove('d-none');
                    btnConfirmImport.classList.remove('d-none');
                    importSelectAll.checked = true;
                } catch (err) {
                    alert('Arquivo JSON inválido.');
                }
            };
            reader.readAsText(file);
        });

        importSelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.import-cb').forEach(cb => cb.checked = e.target.checked);
        });

        btnConfirmImport.addEventListener('click', () => {
            const selectedIdxs = Array.from(document.querySelectorAll('.import-cb:checked')).map(cb => parseInt(cb.value));
            const toImport = loadedImportSongs.filter((s, idx) => selectedIdxs.includes(idx));

            toImport.forEach(song => {
                song.id = Date.now().toString() + Math.random().toString().substring(2, 5);
                this.songs.push(song);
            });

            this.saveToStorage();
            this.updateSelectOptions();
            bootstrap.Modal.getInstance(importModal).hide();
            alert(`${toImport.length} música(s) importada(s) com sucesso!`);
        });
    }
}

/**
 * Gerencia o Play / Stop do sistema
 */
class PlaybackManager {
    constructor() {
        this.btnPlay = document.getElementById('btn-play');
        this.iconPlay = document.getElementById('icon-play');
        this.isPlaying = false;
        this.onStopCallback = null;
        this.init();
    }
    init() { this.btnPlay.addEventListener('click', () => { this.setPlayState(!this.isPlaying); }); }
    onStop(callback) { this.onStopCallback = callback; }
    setPlayState(state) {
        this.isPlaying = state;
        if (this.isPlaying) {
            this.btnPlay.classList.add('playing');
            this.iconPlay.classList.replace('fa-play', 'fa-stop');
        } else {
            this.btnPlay.classList.remove('playing');
            this.iconPlay.classList.replace('fa-stop', 'fa-play');
            if (this.onStopCallback) this.onStopCallback();
        }
    }
}

/**
 * Gerencia o comportamento visual do botão de fases musicais
 */
class NotePhaseManager {
    constructor() {
        this.btnMusic = document.getElementById('btn-music');
        this.iconMusic = document.getElementById('icon-music');
        this.musicPhase = 1;
        this.init();
    }
    init() {
        this.btnMusic.addEventListener('click', () => {
            this.musicPhase = (this.musicPhase % 3) + 1;
            this.btnMusic.classList.remove('phase-3');
            this.iconMusic.className = '';
            this.iconMusic.innerText = '';
            if (this.musicPhase === 1) this.iconMusic.className = 'bi bi-music-note';
            else if (this.musicPhase === 2) this.iconMusic.className = 'bi bi-music-note-beamed';
            else if (this.musicPhase === 3) {
                this.btnMusic.classList.add('phase-3');
                this.iconMusic.className = 'music-emoji';
                this.iconMusic.innerText = '🎶';
            }
        });
    }
}

/**
 * Gerencia os acordes (Interações e Inteligência de Sustenido/Bemol)
 */
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
        this.chordBtns.forEach(btn => btn.addEventListener('click', () => this.handleChordClick(btn)));
        this.keySelect.addEventListener('change', (e) => this.transposeChords(parseInt(e.target.value)));
        this.btnKeyDown.addEventListener('click', () => this.changeKeyStep(-1));
        this.btnKeyUp.addEventListener('click', () => this.changeKeyStep(1));
    }
    handleChordClick(btn) {
        if (btn.classList.contains('active')) {
            btn.classList.remove('repress-anim');
            void btn.offsetWidth;
            btn.classList.add('repress-anim');
        } else {
            this.clearActiveChords();
            btn.classList.add('active');
            if (!this.playbackManager.isPlaying) this.playbackManager.setPlayState(true);
        }
    }
    clearActiveChords() {
        this.chordBtns.forEach(b => { b.classList.remove('active'); b.classList.remove('repress-anim'); });
    }
    changeKeyStep(step) {
        let currentOffset = parseInt(this.keySelect.value, 10);
        let newOffset = (currentOffset + step + 12) % 12;
        this.keySelect.value = newOffset;
        this.transposeChords(newOffset);
    }
    transposeChords(keyOffset) {
        const selectedText = this.keySelect.options[this.keySelect.selectedIndex].text;
        const useFlats = selectedText.includes('b') || selectedText === 'F';
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

/**
 * Inicialização Principal
 */
document.addEventListener('DOMContentLoaded', () => {
    const tomSelectInstance = new TomSelect("#song-select", {
        create: false,
        sortField: { field: "text", direction: "asc" },
        placeholder: "Choose a Song...",
        allowEmptyOption: false
    });

    const themeManager = new ThemeManager();
    const languageManager = new LanguageManager(tomSelectInstance);
    const repertoireManager = new RepertoireManager(tomSelectInstance, languageManager);

    const playbackManager = new PlaybackManager();
    const notePhaseManager = new NotePhaseManager();
    const chordManager = new ChordManager(playbackManager);
});