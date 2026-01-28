class MelodyMachine {
    constructor(baseUrl, musicTheory, cifraPlayer) {
        this.baseUrl = baseUrl;
        this.musicTheory = musicTheory;
        this.cifraPlayer = cifraPlayer;
        this.attackTime = 0.02;
        this.releaseTime = 0.1;
        this.defaultVol = 0.9;
        this.buffers = new Map();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioPath = this.baseUrl + '/assets/audio/studio/Orgao';
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
            'cdim': ['c_baixo', 'd__baixo', 'f__baixo', 'c'],
            'c_dim': ['c__baixo', 'e_baixo', 'g_baixo', 'c_'],
            'ddim': ['d_baixo', 'f_baixo', 'g__baixo', 'd'],
            'd_dim': ['d__baixo', 'f__baixo', 'a_baixo', 'd_'],
            'edim': ['e_baixo', 'g_baixo', 'a__baixo', 'e'],
            'fdim': ['f_baixo', 'g__baixo', 'b_baixo', 'f'],
            'f_dim': ['c_baixo', 'f__baixo', 'a_baixo', 'c'],
            'gdim': ['c__baixo', 'g_baixo', 'a__baixo', 'c_'],
            'g_dim': ['d_baixo', 'g__baixo', 'b_baixo', 'd'],
            'adim': ['c_baixo', 'd__baixo', 'a_baixo', 'c'],
            'a_dim': ['c__baixo', 'e_baixo', 'a__baixo', 'c_'],
            'bdim': ['d_baixo', 'f_baixo', 'b_baixo', 'd'],

            'c1': ['c_baixo', 'c', 'e', 'g'],
            'cm1': ['c_baixo', 'c', 'd_', 'g'],
            'cdim1': ['c_baixo', 'c', 'd_', 'f_'],
            'c_1': ['c__baixo', 'c_', 'f', 'g_'],
            'c_m1': ['c__baixo', 'c_', 'e', 'g_'],
            'c_dim1': ['c__baixo', 'c_', 'e', 'g'],
            'd1': ['d_baixo', 'd', 'f_', 'a'],
            'dm1': ['d_baixo', 'd', 'f', 'a'],
            'ddim1': ['d_baixo', 'd', 'f', 'g_'],
            'd_1': ['d__baixo', 'd_', 'g', 'a_'],
            'd_m1': ['d__baixo', 'd_', 'f_', 'a_'],
            'd_dim1': ['d__baixo', 'd_', 'f_', 'a'],
            'e1': ['e_baixo', 'e', 'g_', 'b'],
            'em1': ['e_baixo', 'e', 'g', 'b'],
            'edim1': ['e_baixo', 'e', 'g', 'a_'],
            'f1': ['f_baixo', 'c', 'f', 'a'],
            'fm1': ['f_baixo', 'c', 'f', 'g_'],
            'fdim1': ['f_baixo', 'f', 'g_', 'b'],
            'f_1': ['f__baixo', 'c_', 'f_', 'a_'],
            'f_m1': ['f__baixo', 'c_', 'f_', 'a'],
            'f_dim1': ['f__baixo', 'c', 'f_', 'a'],
            'g1': ['g_baixo', 'd', 'g', 'b'],
            'gm1': ['g_baixo', 'd', 'g', 'a_'],
            'gdim1': ['g_baixo', 'c_', 'g', 'a_'],
            'g_1': ['g__baixo', 'c', 'd_', 'g_'],
            'g_m1': ['g__baixo', 'd_', 'g_', 'b'],
            'g_dim1': ['g__baixo', 'd', 'g_', 'b'],
            'a1': ['a_baixo', 'c_', 'e', 'a'],
            'am1': ['a_baixo', 'c', 'e', 'a'],
            'adim1': ['a_baixo', 'c', 'd_', 'a'],
            'a_1': ['a__baixo', 'd', 'f', 'a_'],
            'a_m1': ['a__baixo', 'c_', 'f', 'a_'],
            'a_dim1': ['a__baixo', 'c_', 'e', 'a_'],
            'b1': ['b_baixo', 'd_', 'f_', 'b'],
            'bm1': ['b_baixo', 'd', 'f_', 'b'],
            'bdim1': ['b_baixo', 'd', 'f', 'b']
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
        this.activeSources = [];

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
        source.loop = false;

        gainNode.gain.setValueAtTime(0.001, time);
        gainNode.gain.exponentialRampToValueAtTime(volume, time + this.attackTime);

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(time);

        const noteEntry = { source, gainNode };
        this.activeSources.push(noteEntry);

        source.onended = () => {
            // Remove da lista de ativos quando o som acabar naturalmente
            this.activeSources = this.activeSources.filter(item => item !== noteEntry);
            source.disconnect();
            gainNode.disconnect();
        };

        return noteEntry;
    }

    stopNotes(time) {
        this.activeSources.forEach(item => {
            try {
                const { source, gainNode } = item;
                gainNode.gain.cancelScheduledValues(time);
                gainNode.gain.setValueAtTime(gainNode.gain.value, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + this.releaseTime);
                source.stop(time + this.releaseTime + 0.01);
            } catch (e) { }
        });
        this.activeSources = [];
    }

    nextNote() {
        const secondsPerQuarterNote = 60.0 / this.musicTheory.bpm;
        const secondsPerStep = secondsPerQuarterNote / 2;
        this.nextNoteTime += secondsPerStep;

        this.currentStep++;

        if (this.currentStep > this.numSteps) {
            this.stop();
            if (typeof this.onStepsEnd === 'function') {
                this.onStepsEnd();
            }
        }
    }

    scheduler() {
        while (this.isPlaying && this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleCurrentStep();
            this.nextNote();
        }
    }

    scheduleCurrentStep() {
        if (!this.tracksCache) this.refreshTrackCache();

        const stepIndex = this.currentStep - 1;
        const iniciouNovoAcorde = this.currentStep === 1;

        if (iniciouNovoAcorde) {
            this.stopNotes(this.nextNoteTime);
        }

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

                    if (this.cifraPlayer.acordeTocando) {
                        let acordeSimplificado = this.cifraPlayer.acordeTocando;
                        const notas = this.getAcordeNotas(acordeSimplificado);
                        const nota = notas[foundTrack.noteIndex];
                        const bufferKey = `${foundTrack.name}_${nota}`;
                        const buffer = this.buffers.get(bufferKey);

                        this.playSound(buffer, this.nextNoteTime, foundTrack.volume === 2 ? (this.defaultVol / 2) : this.defaultVol);

                        foundTrack.element.classList.add('playing');
                        setTimeout(() => foundTrack.element.classList.remove('playing'), 100);
                    }
                }
            }
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
        this.currentStep = 1;
        this.nextNoteTime = this.audioContext.currentTime;

        this.stopNotes(this.nextNoteTime);

        this.refreshTrackCache();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.scheduler(), this.lookahead);
    }

    stop(stopAll = false) {
        this.isPlaying = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (stopAll)
            this.stopNotes(this.audioContext.currentTime);

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
