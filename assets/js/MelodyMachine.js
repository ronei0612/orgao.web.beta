class MelodyMachine {
    constructor(baseUrl, musicTheory, cifraPlayer) {
        this.baseUrl = baseUrl;
        this.musicTheory = musicTheory;
        this.cifraPlayer = cifraPlayer;
        this.attackTime = 0.02;
        this.releaseTime = 0.1;
        this.defaultVol = 0.5;
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
        //const stylesUrl = `${this.baseUrl}/styles-melody.json`;
        const stylesUrl = `https://roneicostasoares.com.br/orgao.web.beta/styles-melody.json`;
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

        // Se ultrapassou o número de passos, para tudo.
        if (this.currentStep > this.numSteps) {
            this.stop(); // O stop já limpa o intervalo e faz o reset do step para 1
            if (typeof this.onStepsEnd === 'function') {
                this.onStepsEnd();
            }
        }
    }

    scheduler() {
        // Adicionamos "this.isPlaying &&" para interromper o agendamento imediatamente no fim
        while (this.isPlaying && this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleCurrentStep();
            this.nextNote();
        }
    }

    scheduleCurrentStep() {
        if (!this.tracksCache) this.refreshTrackCache();

        const stepIndex = this.currentStep - 1;

        // NOVIDADE: Se for o primeiro step, limpa todos os sons remanescentes da rodada anterior
        if (this.currentStep === 1) {
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

                    // IMPORTANTE: Se você quiser que múltiplas vozes soem no MESMO step, 
                    // você deve processar todos os tracks aqui em vez de dar 'break'.
                    // Se quiser apenas uma nota por vez (polifonia entre steps, mas não no mesmo step), mantenha o break.

                    if (this.cifraPlayer.acordeTocando) {
                        let acordeSimplificado = this.cifraPlayer.acordeTocando;
                        const notas = this.getAcordeNotas(acordeSimplificado);
                        const nota = notas[foundTrack.noteIndex];
                        const bufferKey = `${foundTrack.name}_${nota}`;
                        const buffer = this.buffers.get(bufferKey);

                        // Removido: this.stopCurrentNote(this.nextNoteTime); 
                        // As notas agora vão se sobrepor.

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
        this.currentStep = 1; // Sempre começa do 1
        this.nextNoteTime = this.audioContext.currentTime;

        // Limpa qualquer som antes de começar a sequência
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
        // Para todos os sons imediatamente ao dar Stop
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
