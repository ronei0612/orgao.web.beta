class PreferencesManager {
    constructor(tomSelectInstance) {
        this.ts = tomSelectInstance;

        // Estado do Idioma
        const systemLang = navigator.language || navigator.userLanguage;
        this.currentLang = systemLang.startsWith('en') ? 'en' : 'pt';
        this.translations = {};

        // Estado do Mobile
        this.wakeLock = null;
        this.shouldKeepAwake = false;

        this.initTheme();
        this.initLanguage();
        this.initMobile();
    }

    // --- TEMA (CLARO/ESCURO) ---
    initTheme() {
        const btnToggle = document.getElementById('btn-theme-toggle');
        this.iconTheme = document.getElementById('icon-theme');
        this.htmlElement = document.documentElement;

        const currentTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(currentTheme === 'dark');

        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                const isCurrentlyDark = this.htmlElement.getAttribute('data-bs-theme') === 'dark';
                this.setTheme(!isCurrentlyDark);
            });
        }
    }

    setTheme(isDark) {
        const theme = isDark ? 'dark' : 'light';
        this.htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);

        if (this.iconTheme) {
            if (isDark) {
                this.iconTheme.classList.replace('bi-moon-fill', 'bi-sun-fill');
                this.iconTheme.style.color = "#ffc107";
            } else {
                this.iconTheme.classList.replace('bi-sun-fill', 'bi-moon-fill');
                this.iconTheme.style.color = "";
            }
        }
    }

    // --- IDIOMAS ---
    async initLanguage() {
        this.btnLangToggle = document.getElementById('btn-language-toggle');
        this.iconFlag = document.getElementById('icon-flag');

        try {
            const response = await fetch(AppConfig.translationsURL);
            if (response.ok) {
                this.translations = await response.json();
                this.updateInterface();
            }
        } catch (error) {
            console.error("Aviso: Falha ao carregar as traduções.", error);
        }

        if (this.btnLangToggle) {
            this.btnLangToggle.addEventListener('click', () => {
                this.currentLang = this.currentLang === 'pt' ? 'en' : 'pt';
                this.updateInterface();
            });
        }
    }

    updateInterface() {
        const dict = this.translations[this.currentLang] || {};
        if (!dict || Object.keys(dict).length === 0) return;

        if (this.iconFlag) this.iconFlag.innerText = this.currentLang === 'pt' ? '🇧🇷' : '🇺🇸';

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerText = dict[key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.placeholder = dict[key];
        });

        if (this.ts) {
            this.ts.settings.placeholder = dict.chooseSong;
            this.ts.control_input.placeholder = dict.chooseSong;
        }
    }

    // --- EXPERIÊNCIA MOBILE (TELA CHEIA E WAKELOCK) ---
    initMobile() {
        ['click', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, () => this.enableMobileExperience(), { capture: true, passive: true });
        });

        document.addEventListener('visibilitychange', async () => {
            if (this.shouldKeepAwake && document.visibilityState === 'visible') {
                await this.requestWakeLock();
            }
        });
    }

    async enableMobileExperience() {
        const isMobile = window.innerWidth <= 768 && navigator.maxTouchPoints > 0;
        if (!isMobile) return;

        // 1. Trata o Fullscreen independentemente
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen().catch(() => { });
            }
        } catch (e) {
            console.warn("Fullscreen não suportado ou bloqueado.", e);
        }

        // 2. Trata o WakeLock independentemente (Garante que a tela não apague, até no iPhone)
        try {
            if (!this.wakeLock) {
                await this.requestWakeLock();
            }
        } catch (e) {
            console.warn("WakeLock falhou.", e);
        }
    }

    async requestWakeLock() {
        if ('wakeLock' in navigator && !this.wakeLock) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.shouldKeepAwake = true;
                this.wakeLock.addEventListener('release', () => { this.wakeLock = null; });
            } catch (error) { }
        }
    }
}