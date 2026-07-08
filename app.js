/**
 * Gerencia a troca de tema (Claro / Escuro) usando um botão com ícone
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

        // Troca o ícone: Lua no claro, Sol no escuro
        if (this.isDark) {
            this.iconTheme.classList.replace('bi-moon-fill', 'bi-sun-fill');
            this.iconTheme.style.color = "#ffc107"; // Amarelo para o sol
        } else {
            this.iconTheme.classList.replace('bi-sun-fill', 'bi-moon-fill');
            this.iconTheme.style.color = ""; // Volta a cor original
        }
    }
}

/**
 * Gerencia a troca de idioma e as traduções da interface
 */
class LanguageManager {
    constructor(tomSelectInstance) {
        this.btnLangToggle = document.getElementById('btn-language-toggle');
        this.iconFlag = document.getElementById('icon-flag');
        this.tomSelectInstance = tomSelectInstance;
        this.currentLang = 'en'; // Default

        // Dicionário de traduções
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
    }

    updateInterface() {
        // Altera o emoji da bandeira no botão
        this.iconFlag.innerText = this.currentLang === 'en' ? '🇺🇸' : '🇧🇷';

        const dict = this.translations[this.currentLang];

        // Atualiza todos os elementos que possuem o atributo data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerText = dict[key];
            }
        });

        // Atualiza o texto nativo (placeholder) dentro do componente TomSelect
        if (this.tomSelectInstance) {
            const option = this.tomSelectInstance.options['']; // Option com value vazio
            if (option) {
                this.tomSelectInstance.updateOption('', {
                    value: '',
                    text: dict.chooseSong
                });
            }
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
 * Gerencia os acordes (Interações e Transposição de Tom)
 */
class ChordManager {
    constructor(playbackManager) {
        this.playbackManager = playbackManager;
        this.chordBtns = document.querySelectorAll('.chord-btn');

        this.keySelect = document.getElementById('key-select');
        this.btnKeyDown = document.getElementById('btn-key-down');
        this.btnKeyUp = document.getElementById('btn-key-up');

        this.notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

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
            void btn.offsetWidth; // Force reflow
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
        this.chordBtns.forEach(btn => {
            const baseInterval = parseInt(btn.getAttribute('data-interval'), 10);
            const chordType = btn.getAttribute('data-type');

            const newIndex = (baseInterval + keyOffset) % 12;
            const newNote = this.notes[newIndex];

            btn.innerText = `${newNote}${chordType}`;
        });
    }
}

/**
 * Inicialização do Sistema
 */
document.addEventListener('DOMContentLoaded', () => {

    // Inicia o TomSelect e guarda a referência
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