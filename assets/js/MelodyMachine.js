class MelodyMachine {
    constructor(baseUrl, musicTheory, cifraPlayer) {
        this.baseUrl = baseUrl;
        this.musicTheory = musicTheory;
        this.cifraPlayer = cifraPlayer;

        // Aumentei levemente para suavizar o "tic"
        this.attackTime = 0.05;
        this.releaseTime = 0.15;

        this.buffers = new Map();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioPath = 'https://roneicostasoares.com.br/orgao.web.beta/assets/audio/studio/Orgao';
        this.instrument = 'orgao';
        this.trocarNota = false;
        this.instruments = [
            { note: 3, name: this.instrument },
            { note: 2, name: this.instrument },
            { note: 1, name: this.instrument },
            { note: 0, name: this.instrument }
        ];

        this.acordes = {
            'c': ['g_baixo', 'c', 'e', 'g'],
            'c_': ['g__baixo', 'c_', 'f', 'g_'],
            'd': ['a_baixo', 'd', 'f_', 'a'],
            'd_': ['a__baixo', 'd_', 'g', 'a_'],
            'e': ['g__baixo', 'b_baixo', 'e', 'g_'],
            'f': ['a_baixo', 'c', 'f', 'a'],
            'f_': ['a__baixo', 'c_', 'f_', 'a_'],
            'g': ['g_baixo', 'b_baixo', 'd', 'g'],
            'g_': ['g__baixo', 'c', 'd_', 'g_'],
            'a': ['a_baixo', 'c_', 'e', 'a'],
            'a_': ['a__baixo', 'd', 'f', 'a_'],
            'b': ['b_baixo', 'd_', 'f_', 'b'],
            'cm': ['g_baixo', 'c', 'd_', 'g'],
            'c_m': ['g__baixo', 'c_', 'e', 'g_'],
            'dm': ['a_baixo', 'd', 'f', 'a'],
            'd_m': ['a__baixo', 'd_', 'f_', 'a_'],
            'em': ['g_baixo', 'b_baixo', 'e', 'g'],
            'fm': ['g__baixo', 'c', 'f', 'g_'],
            'f_m': ['a_baixo', 'c_', 'f_', 'a'],
            'gm': ['g_baixo', 'a__baixo', 'd', 'g'],
            'g_m': ['g__baixo', 'b_baixo', 'd_', 'g_'],
            'am': ['a_baixo', 'c', 'e', 'a'],
            'a_m': ['a__baixo', 'c_', 'f', 'a_'],
            'bm': ['b_baixo', 'd', 'f_', 'b'],
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

    playSound(buffer, time, volume = 0.5) {
        if (!buffer) return null;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.loop = true;

        // Suavização do ataque
        // Começamos em 0 absoluto no tempo exato
        gainNode.gain.setValueAtTime(0, time);
        // Rampa linear até o volume desejado
        gainNode.gain.linearRampToValueAtTime(volume, time + this.attackTime);

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(time);

        return { source, gainNode };
    }

    stopCurrentNote(time) {
        if (this.currentSource) {
            const { source, gainNode } = this.currentSource;
            try {
                // Cancela qualquer mudança de volume futura agendada anteriormente
                gainNode.gain.cancelScheduledValues(time);

                // Mantém o volume atual e inicia a descida
                const currentVal = gainNode.gain.value;
                gainNode.gain.setValueAtTime(currentVal, time);

                // Rampa linear para zero para evitar o "tic" no final
                gainNode.gain.linearRampToValueAtTime(0, time + this.releaseTime);

                // Para o som após o tempo de release
                source.stop(time + this.releaseTime + 0.05);

                // Limpeza de memória
                source.onended = () => {
                    source.disconnect();
                    gainNode.disconnect();
                };
            } catch (e) {
                console.error("Erro ao parar nota:", e);
            }
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
            this.trocarNota = false;
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

        if (this.trocarNota) {
            const compassoQuaternario = this.numSteps === 4 || this.numSteps === 8;
            const compassoTernario = this.numSteps === 3 || this.numSteps === 6;
            if (compassoQuaternario && this.currentStep === 5) {
                this.currentStep = 1;
                this.trocarNota = false;
            }
        }

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

        if (foundTrack) {
            // Primeiro paramos a nota anterior suavemente
            this.stopCurrentNote(this.nextNoteTime);

            let acordeSimplificado = this.cifraPlayer.acordeTocando;
            const notas = this.getAcordeNotas(acordeSimplificado);

            if (notas) {
                const nota = notas[foundTrack.noteIndex];
                const bufferKey = `${this.instrument}_${nota}`;
                const buffer = this.buffers.get(bufferKey);

                if (buffer) {
                    // Toca a nova nota
                    const targetVol = foundTrack.volume === 2 ? 0.3 : 0.5;
                    this.currentSource = this.playSound(buffer, this.nextNoteTime, targetVol);
                }
            }

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
