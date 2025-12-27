class MelodyMachine {
    constructor(baseUrl, musicTheory, cifraPlayer) {
        this.baseUrl = baseUrl;
        this.musicTheory = musicTheory;
        this.cifraPlayer = cifraPlayer;
        this.attackTime = 0.02;
        this.releaseTime = 0.1;
        this.buffers = new Map();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioPath = //this.baseUrl + '/assets/audio/studio/Orgao';
        this.audioPath = 'https://roneicostasoares.com.br/orgao.web.beta/assets/audio/studio/Orgao';
        this.instrument = 'orgao';
        this.instruments = [
            { note: 3, name: this.instrument },
            { note: 2, name: this.instrument },
            { note: 1, name: this.instrument },
            { note: 0, name: this.instrument }
        ];

        this.acordes = {
            'c': ['c_baixo', 'e_baixo', 'g_baixo', 'c'],
            'c_': ['c__baixo', 'f_baixo', 'g__baixo', 'c_'],
            'd': ['d_baixo', 'f__baixo', 'a_baixo', 'd'],
            'd_': ['d__baixo', 'g_baixo', 'a__baixo', 'd_'],
            'e': ['e_baixo', 'g__baixo', 'b_baixo', 'e'],
            'f': ['c_baixo', 'f_baixo', 'a_baixo', 'c'],
            'f_': ['c__baixo', 'f__baixo', 'a__baixo', 'c_'],
            'g': ['d_baixo', 'g_baixo', 'b_baixo', 'd'],
            'g_': ['d__baixo', 'g__baixo', 'c', 'd_'],
            'a': ['c__baixo', 'e_baixo', 'a_baixo', 'c_'],
            'a_': ['d_baixo', 'f_baixo', 'a__baixo', 'd'],
            'b': ['d__baixo', 'f__baixo', 'b_baixo', 'd_'],
            'cm': ['c_baixo', 'd__baixo', 'g_baixo', 'c'],
            'c_m': ['c__baixo', 'e_baixo', 'g__baixo', 'c_'],
            'dm': ['d_baixo', 'f_baixo', 'a_baixo', 'd'],
            'd_m': ['d__baixo', 'f__baixo', 'a__baixo', 'd_'],
            'em': ['e_baixo', 'g_baixo', 'b_baixo', 'e'],
            'fm': ['c_baixo', 'f_baixo', 'g__baixo', 'c'],
            'f_m': ['c__baixo', 'f__baixo', 'a_baixo', 'c_'],
            'gm': ['d_baixo', 'g_baixo', 'a__baixo', 'd'],
            'g_m': ['d__baixo', 'g__baixo', 'b_baixo', 'd_'],
            'am': ['c_baixo', 'e_baixo', 'a_baixo', 'c'],
            'a_m': ['c__baixo', 'f_baixo', 'a__baixo', 'c_'],
            'bm': ['d_baixo', 'f__baixo', 'b_baixo', 'd'],
            'cdim': ['f__baixo', 'c', 'd_', 'f_'],
            'c_dim': ['g_baixo', 'c_', 'e', 'g'],
            'ddim': ['g__baixo', 'd', 'f', 'g_'],
            'd_dim': ['a_baixo', 'd_', 'f_', 'a'],
            'edim': ['g_baixo', 'a__baixo', 'e', 'g'],
            'fdim': ['g__baixo', 'b', 'f', 'g_'],
            'f_dim': ['a_baixo', 'c', 'f_', 'a'],
            'gdim': ['g_baixo', 'a__baixo', 'c_', 'g'],
            'g_dim': ['g__baixo', 'b_baixo', 'd', 'g_'],
            'adim': ['a_baixo', 'c', 'd_', 'a'],
            'a_dim': ['a__baixo', 'c_', 'e', 'a_'],
            'bdim': ['b_baixo', 'd', 'f', 'b']
        };

        this.isPlaying = false;
        this.currentStep = 1;
        this.nextNoteTime = 0;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25.0;
        this.numSteps = 8;
        this.timerInterval = null;
        this.styles = null;
        this.stepsPorTempo = null;
        this.tracksCache = null;
        this.currentSource = null;

        this.init();
    }

    async loadSounds() {
        const notasUnicas = new Set(Object.values(this.acordes).flat());
        const loadPromises = [];

        for (const nota of notasUnicas) {
            const name = `${this.instrument}_${nota}`;
            const url = `${this.audioPath}/${name}.ogg`;

            loadPromises.push((async () => {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(name, audioBuffer);
            })());
        }

        await Promise.all(loadPromises);
    }

    async init() {
        await this.loadSounds();
        await this.getStyles();
    }

    async getStyles() {
        const stylesUrl = `${this.baseUrl}/styles-melody.json`;
        try {
            const resp = await fetch(stylesUrl);
            if (!resp.ok) {
                this.styles = null;
                return;
            }
            this.styles = await resp.json();
        } catch (err) {
            this.styles = null;
        }
    }

    playSound(buffer, time, volume = 1) {
        if (!buffer) return null;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.loop = true;

        gainNode.gain.setValueAtTime(0.001, time);
        gainNode.gain.exponentialRampToValueAtTime(volume, time + this.attackTime);

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(time);

        source.onended = () => {
            source.disconnect();
            gainNode.disconnect();
        };

        return { source, gainNode };
    }

    stopCurrentNote(time) {
        if (this.currentSource) {
            const { source, gainNode } = this.currentSource;
            try {
                gainNode.gain.cancelScheduledValues(time);
                gainNode.gain.setValueAtTime(gainNode.gain.value, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + this.releaseTime);

                source.stop(time + this.releaseTime + 0.01);
            } catch { }
            this.currentSource = null;
        }
    }

    nextNote() {
        const secondsPerQuarterNote = 60.0 / this.musicTheory.bpm;
        const secondsPerStep = secondsPerQuarterNote / 2;
        this.nextNoteTime += secondsPerStep;
        this.currentStep++;

        if (this.currentStep > this.numSteps) {
            this.currentStep = 1;
            if (typeof this.onStepsEnd === 'function') {
                this.onStepsEnd();
            }
        }
    }

    scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleCurrentStep();
            this.nextNote();
        }
    }

    scheduleCurrentStep() {
        if (!this.tracksCache) this.refreshTrackCache();

        const stepIndex = this.currentStep - 1;
        let foundTrack = null;

        if (this.tracksCache) {
            for (let i = 0; i < this.tracksCache.length; i++) {
                const trackData = this.tracksCache[i];
                if (!trackData.button.classList.contains('selected')) continue;

                const stepEl = trackData.steps[stepIndex];
                if (!stepEl) continue;

                const volume = parseInt(stepEl.dataset.volume || '0', 10);
                if (volume > 0) {
                    foundTrack = { ...trackData, volume, element: stepEl };
                    break;
                }
            }
        }

        if (foundTrack && this.cifraPlayer.acordeTocando) {
            this.stopCurrentNote(this.nextNoteTime);

            let acordeSimplificado = this.cifraPlayer.acordeTocando;
            const notas = this.getAcordeNotas(acordeSimplificado);
            const nota = notas[foundTrack.noteIndex];
            const bufferKey = `${foundTrack.name}_${nota}`;
            const buffer = this.buffers.get(bufferKey);
            this.currentSource = this.playSound(buffer, this.nextNoteTime, foundTrack.volume === 2 ? 0.3 : 0.5);

            foundTrack.element.classList.add('playing');
            setTimeout(() => foundTrack.element.classList.remove('playing'), 100);
        }
    }

    getAcordeNotas(acordeNome) {
        return this.acordes[acordeNome];
    }

    refreshTrackCache() {
        const tracksContainer = document.getElementById('melodyTracks');
        if (!tracksContainer) return;

        this.tracksCache = Array.from(tracksContainer.children).map(trackEl => {
            const button = trackEl.querySelector('.instrument-button');
            const steps = Array.from(trackEl.querySelectorAll('.step'));

            return {
                noteIndex: parseInt(button.dataset.noteIndex),
                name: button.dataset.name,
                button,
                steps
            };
        });
    }

    start() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.isPlaying = true;
        this.nextNoteTime = this.audioContext.currentTime;
        this.refreshTrackCache();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.scheduler(), this.lookahead);
    }

    stop() {
        this.isPlaying = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.stopCurrentNote(this.audioContext.currentTime);
        this.reset();
    }

    reset() {
        this.currentStep = 1;
        this.nextNoteTime = 0;
    }

    setNumSteps(steps) {
        this.numSteps = steps;
        this.tracksCache = null;
    }
}
