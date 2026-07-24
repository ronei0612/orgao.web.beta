const APP_VERSION = 'v1.0.5';
const APP_UPDATE_DATE = '22 de Julho de 2026';

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
        // Agora ele verifica se a URL NÃO inclui o site da cnbb
        if (!currentSrc || !currentSrc.includes("liturgiadiaria.edicoescnbb.com.br")) {
            this.mainIframe.src = "https://liturgiadiaria.edicoescnbb.com.br/";
        }
    }

    showRepertoire(content = '') {
        this.mainIframe.classList.add('d-none');
        this.mainDisplay.classList.remove('d-none');
        this.mainDisplay.setAttribute('contenteditable', 'false');

        this.mainDisplay.innerHTML = TextFormatter.prepareContent(content);

        if (this.onHydrateScores) this.onHydrateScores();

        this.toggleEditTopBar(false);
    }

    enterEditMode(title = '', content = '') {
        this.mainIframe.classList.add('d-none');
        this.mainDisplay.classList.remove('d-none');
        this.mainDisplay.setAttribute('contenteditable', 'true');

        this.mainDisplay.innerHTML = TextFormatter.prepareContent(content);

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
    constructor(ts, dbManager, viewManager, modalManager, backupManager, toolbarController, audioManager) {
        this.ts = ts;
        this.db = dbManager;
        this.view = viewManager;
        this.modal = modalManager;
        this.toolbar = toolbarController;
        this.audio = audioManager;

        this.currentMode = 'view';
        this.currentSongId = null;

        this.quickReturnTarget = null;
        this.isViewingTarget = false;

        this.playbackSteps = [];
        this.currentStepIndex = -1;
        this.hasSheetMusic = false;
        this.sheetMusicBlock = null;

        this.currentSelectValue = document.getElementById('key-select')?.value || "0";
        this.isAutoAdjustingKey = false;

        backupManager.onImportComplete = () => this.refreshSelectOptions();

        this.toolbar.onStop(() => {
            this.audio.stopAll();
            if (window.rhythmEngine) window.rhythmEngine.stop(); // NOVO: Para o sequenciador!
        });

        this.toolbar.onPlay(() => {
            if (this.currentSongId && this.currentSongId !== 'ACORDES') {
                if (this.currentStepIndex < 0) {
                    this.currentStepIndex = 0;
                }
                this.jumpToStep(this.currentStepIndex, true);
            }
        });

        this.initEvents();
        this.refreshSelectOptions();
        this.changeContext('ACORDES');
    }

    changeContext(newContext) {
        sessionStorage.setItem('app_context', newContext);
        const keySelect = document.getElementById('key-select');

        if (['ACORDES', 'LITURGIA', 'MISSA', 'ORACOES'].includes(newContext)) {
            let savedKey = sessionStorage.getItem(`key_${newContext}`) || "0";

            if (savedKey === "L") {
                savedKey = "0";
            }

            if (keySelect && keySelect.value !== savedKey) {
                this.isAutoAdjustingKey = true;
                keySelect.value = savedKey;
                keySelect.dispatchEvent(new Event('change'));
                this.isAutoAdjustingKey = false;
            }
        }
    }

    updateMusicUIVisibility() {
        if (!this.currentSongId || this.currentSongId === 'ACORDES') {
            this.toggleMusicUI(true);
            return;
        }

        const hasChords = this.view.mainDisplay.querySelector('b, .sheet-music-block') !== null;

        if (!hasChords) {
            const keySelect = document.getElementById('key-select');
            if (keySelect && keySelect.value !== "L") {
                this.isAutoAdjustingKey = true;
                keySelect.value = "L";
                keySelect.dispatchEvent(new Event('change'));
                this.isAutoAdjustingKey = false;
            }
        } else {
            this.toggleMusicUI(true);
        }
    }

    toggleMusicUI(show) {
        const keyGroup = document.getElementById('key-select')?.closest('.input-group');
        const bpmGroup = document.getElementById('bpm-input')?.closest('.input-group');
        const rhythmGroup = document.getElementById('rhythm-select')?.closest('.input-group');
        const pianoWrap = document.querySelector('.piano-wrapper');
        const playbackPanel = document.getElementById('btn-play')?.parentElement;

        const toggle = (el, forceHide) => {
            if (el) {
                if (forceHide) el.classList.add('hide-music-ui');
                else el.classList.remove('hide-music-ui');
            }
        };

        toggle(keyGroup, !show);
        toggle(bpmGroup, !show);
        toggle(rhythmGroup, !show);
        toggle(pianoWrap, !show);
        toggle(playbackPanel, !show);

        if (!show && this.toolbar) {
            this.toolbar.disableFloatingControls();
        }
    }

    autoAdjustKeySelect() {
        const firstChordEl = this.view.mainDisplay.querySelector('b');
        const keySelect = document.getElementById('key-select');

        if (firstChordEl && keySelect && keySelect.value !== "L") {
            const match = firstChordEl.innerText.match(/^([A-G][#b]?)/i);
            if (match) {
                const noteIndex = window.musicTheory.getNoteIndex(match[1]);
                if (noteIndex !== -1 && parseInt(keySelect.value, 10) !== noteIndex) {
                    this.isAutoAdjustingKey = true;
                    keySelect.value = noteIndex;
                    keySelect.dispatchEvent(new Event('change'));
                    this.isAutoAdjustingKey = false;
                }
            }
        }
    }

    transposeSongOnScreen(delta) {
        const chords = this.view.mainDisplay.querySelectorAll('b');
        chords.forEach(b => {
            b.innerText = window.musicTheory.transposeChordString(b.innerText, delta);
        });

        const blocks = this.view.mainDisplay.querySelectorAll('.sheet-music-block');
        blocks.forEach(block => {
            if (block.dataset.score) {
                let data = ScoreCodec.decode(block.dataset.score);
                data = this.transposeSheetData(data, delta);
                block.dataset.score = ScoreCodec.encode(data);

                const svg = window.sheetMusicEditor.drawStandalone(data);
                if (svg) {
                    block.innerHTML = '';
                    block.appendChild(svg);
                }
            }
        });

        this.initHighlights();
    }

    transposeSheetData(data, delta) {
        data.forEach(item => {
            if (!item.rest && !item.bar) {
                item.notes = item.notes.map(noteStr => {
                    const parts = noteStr.split('/');
                    const pitch = parts[0];
                    const octave = parseInt(parts[1], 10);

                    const idx = window.musicTheory.getNoteIndex(pitch);
                    if (idx === -1) return noteStr;

                    let newIdx = idx + delta;
                    let newOctave = octave;

                    if (newIdx >= 12) {
                        newOctave += Math.floor(newIdx / 12);
                        newIdx = newIdx % 12;
                    } else if (newIdx < 0) {
                        newOctave += Math.floor(newIdx / 12);
                        newIdx = ((newIdx % 12) + 12) % 12;
                    }

                    return window.musicTheory.sharpNotes[newIdx].toLowerCase() + '/' + newOctave;
                });
            }
            if (item.chord) {
                item.chord = window.musicTheory.transposeChordString(item.chord, delta);
            }
        });
        return data;
    }

    initEvents() {
        const btnMenu = document.getElementById('btn-main-menu');
        const tsWrapper = document.getElementById('wrapper-song-select');
        const panelAcordes = document.getElementById('chord-degrees-panel');
        const btnPrevChord = document.getElementById('btn-prev-chord');
        const btnNextChord = document.getElementById('btn-next-chord');

        btnMenu.addEventListener('click', () => {
            if (this.quickReturnTarget && !this.isViewingTarget) {
                this.showQuickReturnTarget();
            } else {
                const offcanvasEl = document.getElementById('sideMenu');
                bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).show();
            }
        });

        tsWrapper.addEventListener('click', (e) => {
            if (this.quickReturnTarget && this.isViewingTarget) {
                e.preventDefault();
                e.stopPropagation();
                this.showSongFromQuickReturn();
            }
        });

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

        document.getElementById('btn-oracoes')?.addEventListener('click', (e) => {
            e.preventDefault();
            bootstrap.Offcanvas.getInstance(document.getElementById('sideMenu'))?.hide();
            this.activateQuickReturn('ORACOES');
        });

        document.getElementById('key-select')?.addEventListener('change', (e) => {
            const newVal = e.target.value;

            if (newVal === "L") {
                this.view.mainDisplay.classList.add('mode-lyrics-only', 'lyrics-spacing');
                this.toggleMusicUI(false);

                if (panelAcordes) panelAcordes.classList.add('d-none');
                if (btnPrevChord) btnPrevChord.classList.add('d-none');
                if (btnNextChord) btnNextChord.classList.add('d-none');
            } else {
                this.view.mainDisplay.classList.remove('mode-lyrics-only', 'lyrics-spacing');

                if (!this.currentSongId || this.currentSongId === 'ACORDES') {
                    this.toggleMusicUI(true);
                    if (panelAcordes) panelAcordes.classList.remove('d-none');
                } else {
                    const hasChords = this.view.mainDisplay.querySelector('b, .sheet-music-block') !== null;
                    if (hasChords) {
                        this.toggleMusicUI(true);
                    }
                    if (btnPrevChord) btnPrevChord.classList.remove('d-none');
                    if (btnNextChord) btnNextChord.classList.remove('d-none');
                }

                if (!this.isAutoAdjustingKey && this.currentSelectValue !== "L" && newVal !== "L") {
                    const oldIdx = parseInt(this.currentSelectValue, 10);
                    const newIdx = parseInt(newVal, 10);
                    let delta = newIdx - oldIdx;

                    if (delta > 6) delta -= 12;
                    if (delta < -6) delta += 12;

                    if (delta !== 0 && this.currentSongId && this.currentSongId !== 'ACORDES') {
                        this.transposeSongOnScreen(delta);
                    }
                }
            }
            this.currentSelectValue = newVal;
        });

        this.ts.on('change', (selectedId) => {
            this.cancelQuickReturn();
            this.ts.blur();

            if (selectedId === 'ACORDES' || !selectedId) {
                panelAcordes.classList.remove('d-none');
                btnPrevChord.classList.add('d-none');
                btnNextChord.classList.add('d-none');

                this.currentSongId = null;
                this.view.showRepertoire('');
                this.changeContext('ACORDES');
                this.ts.removeOption('ACORDES');

                this.ts.clear(true);
                this.ts.setTextboxValue('');
                this.ts.blur();

                this.toolbar.disableFloatingControls();
                this.updateMusicUIVisibility();
            } else {
                panelAcordes.classList.add('d-none');
                btnPrevChord.classList.remove('d-none');
                btnNextChord.classList.remove('d-none');

                this.currentSongId = selectedId;
                const song = this.db.getSongById(selectedId);
                this.view.showRepertoire(song ? song.content : '');

                this.changeContext('ACORDES');
                this.initHighlights();

                this.updateMusicUIVisibility();
                this.autoAdjustKeySelect();

                this.ts.addOption({ value: 'ACORDES', text: 'Acordes', isTop: 1 });
                this.toolbar.enableFloatingControls();
            }
        });

        this.ts.on('dropdown_open', () => {
            this.cancelQuickReturn();
            this.view.toggleInlineActions(false);
        });

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
                this.updateMusicUIVisibility();
                this.autoAdjustKeySelect();
            });
        });

        btnPrevChord.addEventListener('click', () => this.navigateStep(-1));
        btnNextChord.addEventListener('click', () => this.navigateStep(1));
    }

    activateQuickReturn(target) {
        this.quickReturnTarget = target;
        if (!this.currentSongId || this.currentSongId === 'ACORDES') {
            this.quickReturnTarget = null;
            this.forceShowTarget(target);
            return;
        }
        this.showQuickReturnTarget();
    }

    forceShowTarget(target) {
        this.changeContext(target);

        if (target === 'LITURGIA') {
            this.view.showLiturgy();
        } else if (target === 'MISSA') {
            this.view.mainDisplay.classList.add('d-none');
            this.view.mainIframe.classList.remove('d-none');
            this.view.mainIframe.src = "./assets/html/santamissa.html";
        } else if (target === 'ORACOES') {
            this.view.mainDisplay.classList.add('d-none');
            this.view.mainIframe.classList.remove('d-none');
            this.view.mainIframe.src = "./assets/html/oracoes.html";
        }
    }

    showQuickReturnTarget() {
        this.isViewingTarget = true;
        this.forceShowTarget(this.quickReturnTarget);

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

        this.updateMusicUIVisibility();
        this.autoAdjustKeySelect();

        this.ts.blur();
    }

    cancelQuickReturn() {
        this.quickReturnTarget = null;
        this.isViewingTarget = false;
        document.getElementById('main-menu-icon').classList.remove('menu-teal');
        document.getElementById('wrapper-song-select').classList.remove('ts-fake-button');
    }

    initHighlights() {
        const blocks = Array.from(this.view.mainDisplay.querySelectorAll('.sheet-music-block'));

        if (blocks.length > 0) {
            this.hasSheetMusic = true;
            this.sheetMusicBlock = blocks[0];
            this.playbackSteps = ScoreCodec.decode(this.sheetMusicBlock.dataset.score);
            this.currentStepIndex = 0;

            this.jumpToStep(0, false);
        } else {
            this.hasSheetMusic = false;
            this.sheetMusicBlock = null;
            this.playbackSteps = Array.from(this.view.mainDisplay.querySelectorAll('b, strong'));
            this.currentStepIndex = 0;

            this.playbackSteps.forEach((node, index) => {
                node.classList.remove('chord-highlight');
                node.style.cursor = 'pointer';
                node.onclick = (e) => {
                    e.stopPropagation();
                    this.jumpToStep(index, true);
                };
            });

            if (this.playbackSteps.length > 0) {
                this.jumpToStep(0, false);
            }
        }
    }

    jumpToStep(index, playAudio = true) {
        if (!this.playbackSteps || this.playbackSteps.length === 0) return;
        if (index < 0 || index >= this.playbackSteps.length) return;

        this.currentStepIndex = index;

        if (this.hasSheetMusic && this.sheetMusicBlock) {
            const data = ScoreCodec.decode(this.sheetMusicBlock.dataset.score);
            const svg = window.sheetMusicEditor.drawStandalone(data, index);
            if (svg) {
                this.sheetMusicBlock.innerHTML = '';
                this.sheetMusicBlock.appendChild(svg);
            }

            if (playAudio && this.toolbar.isPlaying) {
                const step = this.playbackSteps[index];

                if (step.rest) {
                    this.audio.stopActiveFluteNotes();
                } else {
                    const fluteNote = step.notes[0];
                    this.audio.playFluteNote(fluteNote);
                }

                let activeChord = "";
                for (let i = index; i >= 0; i--) {
                    if (this.playbackSteps[i].chord) {
                        activeChord = this.playbackSteps[i].chord;
                        break;
                    }
                }

                if (activeChord) {
                    this.audio.playChord(activeChord, this.toolbar.musicPhase);
                    if (window.rhythmEngine) window.rhythmEngine.triggerChord(activeChord, this.toolbar.musicPhase);
                } else {
                    this.audio.stopChordLoop();
                }
            }
        } else {
            this.playbackSteps.forEach(node => node.classList.remove('chord-highlight'));

            const targetNode = this.playbackSteps[index];
            if (targetNode) {
                targetNode.classList.add('chord-highlight');
                targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });

                if (playAudio && this.toolbar.isPlaying) {
                    const chordText = targetNode.innerText;
                    this.audio.playChord(chordText, this.toolbar.musicPhase);
                    if (window.rhythmEngine) window.rhythmEngine.triggerChord(chordText, this.toolbar.musicPhase);
                }
            }
        }
    }

    navigateStep(direction) {
        if (!this.playbackSteps || this.playbackSteps.length === 0) return;

        let nextIndex = this.currentStepIndex + direction;

        if (direction === -1) {
            if (nextIndex < 0) {
                nextIndex = 0;
            }
        } else if (direction === 1) {
            if (nextIndex >= this.playbackSteps.length) {
                nextIndex = 0;
            }
        }

        this.jumpToStep(nextIndex, this.toolbar.isPlaying);
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

            this.updateMusicUIVisibility();
            this.autoAdjustKeySelect();
        });
    }
}

// INICIALIZAÇÃO PRINCIPAL DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {

    const loggerManager = new LoggerManager(APP_VERSION, APP_UPDATE_DATE);

    const tomSelectInstance = new TomSelect("#song-select", {
        create: false,
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

    const prefsManager = new PreferencesManager(tomSelectInstance);
    const modalManager = new ModalManager(prefsManager);
    const viewManager = new ViewManager();
    const backupManager = new BackupManager(dbManager);

    const toolbar = new ToolbarController(viewManager, tomSelectInstance, modalManager);

    const musicTheory = new MusicTheory();
    window.musicTheory = musicTheory;

    const audioManager = new AudioManager();
    window.audioManager = audioManager;
    audioManager.preloadAll();

    const rhythmEngine = new RhythmEngine(toolbar, audioManager);
    window.rhythmEngine = rhythmEngine;
    rhythmEngine.init();

    const chordManager = new ChordManager(toolbar, musicTheory, audioManager);
    const pianoManager = new PianoManager(musicTheory);

    const sheetMusicEditor = new SheetMusicEditor();
    window.sheetMusicEditor = sheetMusicEditor;

    const repertoireController = new RepertoireController(
        tomSelectInstance, dbManager, viewManager, modalManager, backupManager,
        toolbar, audioManager
    );

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

    if (viewManager.btnAddSheetMusic) {
        viewManager.btnAddSheetMusic.addEventListener('click', (e) => {
            e.preventDefault();
            sheetMusicEditor.open(null, null, (svgElement, currentData, existingBlock) => {
                insertSheetMusicBlock(svgElement, currentData, existingBlock);
            });
        });
    }

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

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Falhou: ', err));
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_INSTALLED') {
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