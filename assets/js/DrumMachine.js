class DrumMachine {
    constructor(baseUrl, cifraPlayer, musicTheory) {
        this.baseUrl = baseUrl;
        this.cifraPlayer = cifraPlayer;
        this.musicTheory = musicTheory;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = new Map();
        this.audioPath = this.baseUrl + '/assets/audio/studio/Drums/';

        this.instruments = [
            { name: 'prato', icon: 'prato.svg', file: this.audioPath + 'ride.ogg', somAlternativo: this.audioPath + 'prato2.ogg' },
            { name: 'tom', icon: 'tom.svg', file: this.audioPath + 'tom-03.ogg', somAlternativo: this.audioPath + 'tom-02.ogg' },
            { name: 'surdo', icon: 'surdo.svg', file: this.audioPath + 'tom.ogg', somAlternativo: this.audioPath + 'prato1.ogg' },
            { name: 'chimbal', icon: 'chimbal.svg', file: this.audioPath + 'chimbal.ogg', somAlternativo: this.audioPath + 'aberto.ogg' },
            { name: 'caixa', icon: 'caixa.svg', file: this.audioPath + 'caixa.ogg', somAlternativo: this.audioPath + 'aro.ogg' },
            { name: 'bumbo', icon: 'bumbo.svg', file: this.audioPath + 'bumbo.ogg', somAlternativo: null },
            { name: 'meia-Lua', icon: 'meiaLua.svg', file: this.audioPath + 'meialua.ogg', somAlternativo: this.audioPath + 'meialua2.ogg' },
            { name: 'violao-baixo', icon: 'violao.svg', file: null, somAlternativo: 'violao_' },
            { name: 'violao-cima', icon: 'violao.svg', file: null, somAlternativo: 'violao_' },
            { name: 'baixo', icon: 'baixo.svg', file: null, somAlternativo: null }
        ];

        this.isPlaying = false;
        this.currentStep = 1;
        this.nextNoteTime = 0;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25.0;
        this.numSteps = 16;

        // Substituído animationFrameId por timerInterval para estabilidade em background
        this.timerInterval = null;

        this.lastChimbalAbertoSource = null;
        this.styles = null;
        this.atrasoMudarNota = 0.03;
        this.stepsPorTempo = null;

        // Cache para evitar ler o DOM a cada milissegundo (Performance Crítica)
        this.tracksCache = null;

        this.init();
    }

    async init() {
        await this.loadSounds();
        await this.getStyles();
    }

    async getStyles() {
        const stylesUrl = `${this.baseUrl}/styles.json`;
        try {
            const resp = await fetch(stylesUrl);
            if (!resp.ok) {
                throw new Error(`Falha ao carregar styles.json: ${resp.status}`);
            }
            this.styles = await resp.json();
        } catch (err) {
            console.warn('DrumMachine: não foi possível carregar styles.json, mantendo comportamento padrão.', err);
            this.styles = this.styles || null;
        }
    }

    async loadSounds() {
        const loadPromises = [];

        this.instruments.forEach(instrument => {
            if (!instrument.file) return;
            loadPromises.push((async () => {
                const response = await fetch(instrument.file);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(instrument.name, audioBuffer);

                if (instrument.somAlternativo) {
                    const responseAlt = await fetch(instrument.somAlternativo);
                    const arrayBufferAlt = await responseAlt.arrayBuffer();
                    const audioBufferAlt = await this.audioContext.decodeAudioData(arrayBufferAlt);
                    this.buffers.set(instrument.name + '-alt', audioBufferAlt);
                }
            })());
        });

        const notas = this.musicTheory.notas;
        notas.forEach(nota => {
            var instrument = 'baixo';
            const baixoFileName = `${this.audioPath}/${instrument}_${nota}.ogg`;
            loadPromises.push((async () => {
                const resp = await fetch(baixoFileName);
                const arrayBuffer = await resp.arrayBuffer();
                const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(`baixo_${nota}`, buffer);
            })());

            instrument = 'violao';
            const violaoFileName = `${this.audioPath}/${instrument}_${nota}.ogg`;
            loadPromises.push((async () => {
                const resp = await fetch(violaoFileName);
                const arrayBuffer = await resp.arrayBuffer();
                const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(`${instrument}-baixo_${nota}`, buffer);
            })());

            const violao1FileName = `${this.audioPath}/${instrument}_${nota}1.ogg`;
            loadPromises.push((async () => {
                const resp = await fetch(violao1FileName);
                const arrayBuffer = await resp.arrayBuffer();
                const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(`${instrument}-cima_${nota}`, buffer);
            })());

            const violaoFileNameMenor = `${this.audioPath}/${instrument}_${nota}m.ogg`;
            loadPromises.push((async () => {
                const resp = await fetch(violaoFileNameMenor);
                const arrayBuffer = await resp.arrayBuffer();
                const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(`${instrument}-baixo_${nota}m`, buffer);
            })());

            const violao1FileNameMenor = `${this.audioPath}/${instrument}_${nota}m1.ogg`;
            loadPromises.push((async () => {
                const resp = await fetch(violao1FileNameMenor);
                const arrayBuffer = await resp.arrayBuffer();
                const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(`${instrument}-cima_${nota}m`, buffer);
            })());
        });

        const violaoAlt = `${this.audioPath}/violao_.ogg`;
        const responseViolaoAlt = await fetch(violaoAlt);
        const arrayBufferViolaoAlt = await responseViolaoAlt.arrayBuffer();
        const audioBufferViolaoAlt = await this.audioContext.decodeAudioData(arrayBufferViolaoAlt);
        this.buffers.set('violao-baixo-alt', audioBufferViolaoAlt);
        this.buffers.set('violao-cima-alt', audioBufferViolaoAlt);

        await Promise.all(loadPromises);
    }

    playSound(buffer, time, volume = 1, isChimbalAberto = false) {
        if (!buffer) return;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(time);

        if (isChimbalAberto) {
            this.lastChimbalAbertoSource = source;
        }

        // PERFORMANCE: Desconectar nós após o uso para liberar memória do navegador
        // Isso evita "estalos" quando há muitos sons (polifonia alta)
        source.onended = () => {
            source.disconnect();
            gainNode.disconnect();
        };
    }

    scheduleNote(instrument, step, time, volume) {
        if (volume === 3) {
            const buffer = this.buffers.get(instrument + '-alt');
            if (buffer) {
                this.playSound(buffer, time, 1, instrument === 'chimbal');
            }
        }
        else {
            if (!this.playBass(instrument, time, volume) && !this.playViolao(instrument, time, volume)) {
                const buffer = this.buffers.get(instrument);
                if (buffer && volume > 0) {
                    this.playSound(buffer, time, volume === 2 ? 0.3 : 1);
                }
            }
        }
    }

    nextNote() {
        const secondsPerQuarterNote = 60.0 / this.musicTheory.bpm;
        const secondsPerStep = secondsPerQuarterNote / 4;
        this.nextNoteTime += secondsPerStep;
        this.currentStep++;

        if (this.currentStep > this.numSteps) {
            this.currentStep = 1;
            if (this.onStepsEnd) {
                this.fecharChimbal();
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

    fecharChimbal(instrument, volume) {
        if (instrument !== 'chimbal') return;

        if (volume === 1 || volume === 2) {
            if (this.lastChimbalAbertoSource) {
                try {
                    this.lastChimbalAbertoSource.stop(0);
                } catch (e) {
                    // Ignore se ja parou
                }
                this.lastChimbalAbertoSource = null;
            }
        }
    }

    scheduleCurrentStep() {
        // Reconstrói cache se necessário (ex: primeira execução ou mudança de steps)
        if (!this.tracksCache) {
            this.refreshTrackCache();
        }

        const tempoAtual = Math.floor((this.currentStep - 1) / this.stepsPorTempo) + 1;
        const isInicioTempo = ((this.currentStep - 1) % this.stepsPorTempo === 0);

        if (isInicioTempo) {
            this.blinkSelectedRhythmButton(tempoAtual);
        }

        const stepImpar = this.currentStep % 2 === 1;
            if (stepImpar)
                this.playEpiano();

        // Loop otimizado usando Cache
        const stepIndex = this.currentStep - 1;

        if (this.tracksCache) {
            for (let i = 0; i < this.tracksCache.length; i++) {
                const trackData = this.tracksCache[i];

                // Validações rápidas de memória
                if (!trackData.instrument || !trackData.button.classList.contains('selected')) continue;

                // Acesso direto ao step (O(1))
                const stepEl = trackData.steps[stepIndex];
                if (!stepEl) continue;

                const volume = parseInt(stepEl.dataset.volume || '0', 10);
                if (volume <= 0) continue;

                this.fecharChimbal(trackData.instrument, volume);
                this.scheduleNote(trackData.instrument, this.currentStep, this.nextNoteTime, volume);

                // Feedback visual (apenas se necessário)
                stepEl.classList.add('playing');
                // setTimeout é aceitável para UI, pois não bloqueia o thread de áudio
                setTimeout(() => stepEl.classList.remove('playing'), 100);
            }
        }
    }

    /**
     * Pisca o botão do ritmo selecionado conforme a batida do compasso.
     * @param {number} beat - Número da batida atual (1 = acento)
     */
    blinkSelectedRhythmButton(beat) {
        const selectedButton = document.querySelector('.rhythm-button.selected');
        if (!selectedButton) return;

        selectedButton.classList.remove('flash-accent', 'flash-weak');
        void selectedButton.offsetWidth;

        if (beat === 1) {
            selectedButton.classList.add('flash-accent');
        } else {
            selectedButton.classList.add('flash-weak');
        }

        setTimeout(() => {
            selectedButton.classList.remove('flash-accent', 'flash-weak');
        }, 150);
    }

    // PERFORMANCE: Cria um cache do DOM para não fazer querySelector a cada batida
    refreshTrackCache() {
        const tracksContainer = document.getElementById('tracks');
        if (!tracksContainer) return;

        // Converte HTMLCollection para Array para facilitar iteração
        this.tracksCache = Array.from(tracksContainer.children).map(trackEl => {
            const img = trackEl.querySelector('label img');
            const instrument = img ? img.title : null;
            const button = trackEl.querySelector('.instrument-button');
            // Mapeia todos os steps deste track em um array indexável por (stepNumber - 1)
            const steps = Array.from(trackEl.querySelectorAll('.step'));

            return { instrument, button, steps };
        });
    }

    start() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;
        this.currentStep = 1;
        this.nextNoteTime = this.audioContext.currentTime + 0.1; // Pequeno delay inicial para sincronia

        // Garante que o cache do DOM esteja atualizado ao iniciar
        this.refreshTrackCache();

        // PERFORMANCE: setInterval é mais estável que requestAnimationFrame para áudio em background
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.scheduler(), this.lookahead);
    }

    stop() {
        this.isPlaying = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.reset();
    }

    reset() {
        this.currentStep = 1;
        this.nextNoteTime = 0;
    }

    setNumSteps(steps) {
        this.numSteps = steps;
        // Invalida o cache para ser recriado no próximo ciclo, já que o UI mudou o DOM
        this.tracksCache = null;
    }

    playBass(instrument, time, volume) {
        if (instrument === 'baixo' && this.cifraPlayer.acordeTocando) {
            const bass = instrument + '_' + this.cifraPlayer.baixo;
            const buffer = this.buffers.get(bass);
            if (buffer && volume > 0) {
                this.playSound(buffer, time, volume === 2 ? 0.4 : 1);
                return true;
            }
        }
        return false;
    }

    playViolao(instrument, time, volume) {
        if (instrument.includes('violao') && this.cifraPlayer.acordeTocando) {
            const violao = instrument + '_' + this.cifraPlayer.acordeTocando;
            const buffer = this.buffers.get(violao);
            if (buffer && volume > 0) {
                this.playSound(buffer, time, volume === 2 ? 0.4 : 1);
                return true;
            }
        }
        return false;
    }

    playEpiano() {
        if (this.cifraPlayer.epianoGroup.length > 0 && this.cifraPlayer.tocarEpiano) {
            this.cifraPlayer.epianoPlay();
        }
    }
}