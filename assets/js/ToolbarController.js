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
        this.initDragAndDrop();
    }

    // --- CONTROLE DE BPM ---
    initBpm() {
        this.bpmInput = document.getElementById('bpm-input');
        if (!this.bpmInput) return;

        document.getElementById('btn-bpm-minus-5')?.addEventListener('click', () => this.changeBpm(-5));
        document.getElementById('btn-bpm-minus-1')?.addEventListener('click', () => this.changeBpm(-1));
        document.getElementById('btn-bpm-plus-5')?.addEventListener('click', () => this.changeBpm(5));

        this.bpmInput.addEventListener('change', () => this.changeBpm(0));
    }

    changeBpm(amount) {
        let val = parseInt(this.bpmInput.value, 10);
        if (isNaN(val)) val = 90;

        val += amount;
        val = Math.max(1, Math.min(999, val));

        this.bpmInput.value = val;
    }

    // --- PLAYBACK (Botão Play) ---
    initPlayback() {
        this.btnPlay = document.getElementById('btn-play');
        this.iconPlay = document.getElementById('icon-play');
        this.onStopCallbacks = [];
        this.onPlayCallbacks = [];

        if (this.btnPlay) {
            this.btnPlay.addEventListener('click', () => this.setPlayState(!this.isPlaying));
        }
    }

    onStop(callback) {
        this.onStopCallbacks.push(callback);
    }

    onPlay(callback) {
        this.onPlayCallbacks.push(callback);
    }

    setPlayState(state) {
        this.isPlaying = state;
        if (this.isPlaying) {
            this.btnPlay.classList.add('playing');
            this.iconPlay.classList.replace('fa-play', 'fa-stop');
            this.onPlayCallbacks.forEach(cb => cb());
        } else {
            this.btnPlay.classList.remove('playing');
            this.iconPlay.classList.replace('fa-stop', 'fa-play');
            this.onStopCallbacks.forEach(cb => cb());
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
            this.view.modalManager.show(
                'Atenção',
                'Isso vai apagar TODO o seu repertório e configurações. O aplicativo voltará ao estado de fábrica. Deseja continuar?',
                async () => {
                    localStorage.clear();
                    if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (let reg of regs) {
                            await reg.unregister();
                        }
                    }
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        for (let key of keys) {
                            await caches.delete(key);
                        }
                    }
                    window.location.reload();
                }
            );
        });
    }

    // --- MOTOR DRAG AND DROP OTIMIZADO ---
    initDragAndDrop() {
        const playBtn = document.getElementById('btn-play');
        if (!playBtn) return;

        this.playbackPanel = playBtn.parentElement;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.panelStartX = 0;
        this.panelStartY = 0;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
    }

    enableFloatingControls() {
        if (!this.playbackPanel) return;

        this.playbackPanel.removeEventListener('pointerdown', this.onPointerDown);

        this.playbackPanel.classList.add('floating-controls');

        const initialLeft = (window.innerWidth - this.playbackPanel.offsetWidth) / 2;
        const initialTop = window.innerHeight - this.playbackPanel.offsetHeight - 120;

        this.playbackPanel.style.left = `${initialLeft}px`;
        this.playbackPanel.style.top = `${initialTop}px`;
        this.playbackPanel.style.margin = '0';

        this.playbackPanel.addEventListener('pointerdown', this.onPointerDown);
    }

    disableFloatingControls() {
        if (!this.playbackPanel) return;

        this.playbackPanel.removeEventListener('pointerdown', this.onPointerDown);
        this.playbackPanel.removeEventListener('pointermove', this.onPointerMove);
        this.playbackPanel.removeEventListener('pointerup', this.onPointerUp);
        this.playbackPanel.removeEventListener('pointercancel', this.onPointerUp);

        this.playbackPanel.classList.remove('floating-controls');
        this.playbackPanel.style.position = '';
        this.playbackPanel.style.zIndex = '';
        this.playbackPanel.style.left = '';
        this.playbackPanel.style.top = '';
        this.playbackPanel.style.margin = '';

        this.isDragging = false;
    }

    onPointerDown(e) {
        if (e.target.closest('button')) return;

        // Impede ações padrão do celular (como zoom, seleção de texto ou scroll) enquanto arrasta
        e.preventDefault();

        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        this.panelStartX = parseInt(this.playbackPanel.style.left, 10) || 0;
        this.panelStartY = parseInt(this.playbackPanel.style.top, 10) || 0;

        this.playbackPanel.setPointerCapture(e.pointerId);

        // Vincula ouvintes de movimento no próprio elemento para arrastar de forma contínua
        this.playbackPanel.addEventListener('pointermove', this.onPointerMove);
        this.playbackPanel.addEventListener('pointerup', this.onPointerUp);
        this.playbackPanel.addEventListener('pointercancel', this.onPointerUp);
    }

    onPointerMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        let newLeft = this.panelStartX + deltaX;
        let newTop = this.panelStartY + deltaY;

        const minLeft = 10;
        const maxLeft = window.innerWidth - this.playbackPanel.offsetWidth - 10;
        const minTop = 10;
        const maxTop = window.innerHeight - this.playbackPanel.offsetHeight - 10;

        newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
        newTop = Math.max(minTop, Math.min(maxTop, newTop));

        this.playbackPanel.style.left = `${newLeft}px`;
        this.playbackPanel.style.top = `${newTop}px`;
    }

    onPointerUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            try {
                this.playbackPanel.releasePointerCapture(e.pointerId);
            } catch (err) { }
            this.playbackPanel.removeEventListener('pointermove', this.onPointerMove);
            this.playbackPanel.removeEventListener('pointerup', this.onPointerUp);
            this.playbackPanel.removeEventListener('pointercancel', this.onPointerUp);
        }
    }
}