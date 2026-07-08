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
 * Gerencia a troca de idioma e atualiza o TomSelect adequadamente
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
                organ: "ORGAN"
            },
            pt: {
                settingsTitle: "Configurações",
                settingsDesc: "Ajuste as preferências do aplicativo.",
                chooseSong: "Escolha a Música...",
                noRhythm: "Sem ritmo",
                organ: "ÓRGÃO"
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

        // Atualiza elementos HTML normais usando innerText
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerText = dict[key];
            }
        });

        // Força a atualização do texto do TomSelect (Placeholder nativo)
        if (this.tomSelectInstance) {
            // Atualiza o texto visual do input do plugin
            this.tomSelectInstance.settings.placeholder = dict.chooseSong;
            this.tomSelectInstance.control_input.placeholder = dict.chooseSong;

            // Atualiza a opção vazia na lista suspensa
            this.tomSelectInstance.updateOption('', {
                value: '',
                text: dict.chooseSong
            });
            this.tomSelectInstance.sync();
        }
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

    init() {
        this.btnPlay.addEventListener('click', () => {
            this.setPlayState(!this.isPlaying);
        });
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

/**
 * Gerencia o comportamento visual do botão de fases musicais (1, 2, 3)
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

        // Escalas cromáticas separadas
        this.notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

        this.init();
    }

    init() {
        this.playbackManager.onStop(() => this.clearActiveChords());

        this.chordBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleChordClick(btn));
        });

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
        let currentOffset = parseInt(this.keySelect.value, 10);
        let newOffset = (currentOffset + step + 12) % 12;

        this.keySelect.value = newOffset;
        this.transposeChords(newOffset);
    }

    transposeChords(keyOffset) {
        // Pega o texto da opção selecionada (ex: "Eb", "F#", "C")
        const selectedText = this.keySelect.options[this.keySelect.selectedIndex].text;

        // Se o tom tiver "b" no nome, OU se o tom for "F" (Fá maior usa notas bemóis), usa a escala flat
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
        sortField: { field: "text", direction: "asc" }
    });

    const themeManager = new ThemeManager();
    const languageManager = new LanguageManager(tomSelectInstance);
    const playbackManager = new PlaybackManager();
    const notePhaseManager = new NotePhaseManager();
    const chordManager = new ChordManager(playbackManager);
});