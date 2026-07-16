class ToolbarController {
    constructor(viewManager, tomSelectInstance) {
        this.view = viewManager;
        this.ts = tomSelectInstance;

        this.isPlaying = false;
        this.musicPhase = 1;
        this.onStopCallback = null;

        this.initBpm();
        this.initPlayback();
        this.initNotePhase();
        this.initRestore();
    }

    // --- CONTROLE DE BPM ---
    initBpm() {
        this.bpmInput = document.getElementById('bpm-input');
        if (!this.bpmInput) return;

        document.getElementById('btn-bpm-minus-5')?.addEventListener('click', () => this.changeBpm(-5));
        document.getElementById('btn-bpm-minus-1')?.addEventListener('click', () => this.changeBpm(-1));
        document.getElementById('btn-bpm-plus-5')?.addEventListener('click', () => this.changeBpm(5));

        this.bpmInput.addEventListener('change', () => this.changeBpm(0)); // Apenas para validar limites
    }

    changeBpm(amount) {
        let val = parseInt(this.bpmInput.value, 10);
        if (isNaN(val)) val = 90;

        val += amount;
        val = Math.max(1, Math.min(999, val)); // Limite de 1 a 999

        this.bpmInput.value = val;
    }

    // --- PLAYBACK (Botão Play) ---
    initPlayback() {
        this.btnPlay = document.getElementById('btn-play');
        this.iconPlay = document.getElementById('icon-play');

        if (this.btnPlay) {
            this.btnPlay.addEventListener('click', () => this.setPlayState(!this.isPlaying));
        }
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
            if (this.onStopCallback) this.onStopCallback();
        }
    }

    // --- FASES DA NOTA (Ícone musical) ---
    initNotePhase() {
        this.btnMusic = document.getElementById('btn-music');
        this.iconMusic = document.getElementById('icon-music');

        if (this.btnMusic) {
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

    initRestore() {
        const btnRestore = document.getElementById('btn-restore');
        if (!btnRestore) return;

        btnRestore.addEventListener('click', (e) => {
            e.preventDefault();

            // Usamos a Modal que já criamos para segurança
            this.view.modalManager.show(
                'Atenção',
                'Isso vai apagar TODO o seu repertório e configurações. O aplicativo voltará ao estado de fábrica. Deseja continuar?',
                async () => {
                    // 1. Limpa o LocalStorage
                    localStorage.clear();

                    // 2. Desregistra os Service Workers
                    if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (let reg of regs) {
                            await reg.unregister();
                        }
                    }

                    // 3. Limpa completamente a API de Cache do navegador
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        for (let key of keys) {
                            await caches.delete(key);
                        }
                    }

                    // 4. Hard Refresh forçado na página
                    window.location.reload();
                }
            );
        });
    }
}