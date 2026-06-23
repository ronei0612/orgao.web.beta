class DrumMachine {
    constructor(baseUrl, chordSheetPlayer, musicTheory, audioManager) {
        this.baseUrl = baseUrl;
        this.chordSheetPlayer = chordSheetPlayer;
        this.musicTheory = musicTheory;
        this.audioContext = audioManager.audioContext;
        this.audioManager = audioManager;
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
            { name: 'bassNote', icon: 'baixo.svg', file: null, somAlternativo: null }
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
        // Rastreio para evitar vazamento de memória e cortar sons ---
        this.activeSources = new Set();
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
        const urls = {};

        // Instrumentos principais e alternativos
        this.instruments.forEach(inst => {
            if (inst.file) urls[inst.name] = inst.file;
            if (inst.somAlternativo?.endsWith('.ogg')) {
                urls[inst.name + '-alt'] = inst.somAlternativo;
            }
        });

        // Baixo, violão e variações
        this.musicTheory.notas.forEach(nota => {
            urls[`baixo_${nota}`] = `${this.audioPath}/baixo_${nota}.ogg`;
            urls[`violao-baixo_${nota}`] = `${this.audioPath}/violao_${nota}.ogg`;
            urls[`violao-cima_${nota}`] = `${this.audioPath}/violao_${nota}1.ogg`;
            urls[`violao-baixo_${nota}m`] = `${this.audioPath}/violao_${nota}m.ogg`;
            urls[`violao-cima_${nota}m`] = `${this.audioPath}/violao_${nota}m1.ogg`;
        });

        // Violão alternativo
        urls['violao-baixo-alt'] = `${this.audioPath}/violao_.ogg`;
        urls['violao-cima-alt'] = `${this.audioPath}/violao_.ogg`;

        this.buffers = await this.audioManager.loadBuffers(urls);
    }

    playSound(buffer, time, volume = 1, isChimbalAberto = false) {
        if (!buffer) return;

        const node = this.audioManager.playNode(buffer, time, volume, 0.003, false, this.activeSources);

        // Se for chimbal aberto, guardamos o objeto {source, gainNode} retornado
        if (isChimbalAberto && node) {
            this.lastChimbalAbertoNode = node;
        }
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

    scheduleNote(instrument, step, time, volume) {
        if (volume === 3) {
            const buffer = this.buffers.get(instrument + '-alt');
            if (buffer) {
                this.playSound(buffer, time, 1, instrument === 'chimbal');
            }
        } else {
            if (!this.playBass(instrument, time, volume) && !this.playViolao(instrument, time, volume)) {
                const buffer = this.buffers.get(instrument);
                if (buffer && volume > 0) {
                    const vol = (volume === 2) ? 0.3 : 1;
                    this.playSound(buffer, time, vol, instrument === 'chimbal');
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

    fecharChimbal(instrument, volume, time) { // Adicione o 'time'
        if (volume === undefined || volume === 1 || volume === 2 || volume === 3) {
            if (this.lastChimbalAbertoNode) {
                // Usa o time agendado, ou o momento atual como fallback
                this.audioManager.stopNode(this.lastChimbalAbertoNode, time || this.audioContext.currentTime, 0.02);
                this.lastChimbalAbertoNode = null;
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

                if (trackData.instrument === 'chimbal') {
                    this.fecharChimbal(trackData.instrument, volume, this.nextNoteTime); // Envia o tempo futuro
                }
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
        void selectedButton.offsetWidth; // PROBLEMA: Força Recálculo de Layout, USE O requestAnimationFrame

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

    setNumSteps(steps) {
        this.numSteps = steps;
        // Invalida o cache para ser recriado no próximo ciclo, já que o UI mudou o DOM
        this.tracksCache = null;
    }

    playBass(instrument, time, volume) {
        if (instrument === 'bassNote' && this.chordSheetPlayer.playingChord) {
            const bass = instrument + '_' + this.chordSheetPlayer.bassNote;
            const buffer = this.buffers.get(bass);
            if (buffer && volume > 0) {
                this.audioManager.playNode(buffer, time, volume === 2 ? 0.4 : 1, 0.003, false, this.activeSources);
                return true;
            }
        }
        return false;
    }

    playViolao(instrument, time, volume) {
        if (instrument.includes('violao') && this.chordSheetPlayer.playingChord) {
            const violao = instrument + '_' + this.chordSheetPlayer.playingChord;
            const buffer = this.buffers.get(violao);
            if (buffer && volume > 0) {
                this.audioManager.playNode(buffer, time, volume === 2 ? 0.4 : 1, 0.003, false, this.activeSources);
                return true;
            }
        }
        return false;
    }

    playEpiano() {
        if (this.chordSheetPlayer.epianoGroup.length > 0 && this.chordSheetPlayer.tocarEpiano) {
            this.chordSheetPlayer.epianoPlay();
        }
    }
}