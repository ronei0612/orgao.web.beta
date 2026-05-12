class PartituraPlayer {
    constructor(elements, cifraPlayer, partituraEditor, baseUrl, audioManager) {
        this.audioPath = `${baseUrl}/assets/audio/studio/Flauta`;
        this.instrumento = 'flauta';
        this.elements = elements;
        this.cifraPlayer = cifraPlayer;
        this.partituraEditor = partituraEditor;
        this.partituraPlaybackIndex = -1;
        this.buffers = new Map();
        this.audioContextManager = audioManager;
        this.audioContext = audioManager.audioContext; 
        this.activeSources = [];
        this.init();
    }

    async init() {
        await this.loadSounds();

        // Registra callback para bindar cliques sempre que a visualização for redesenhada
        this.partituraEditor.onViewDrawn = () => this.bindClickNotas();
    }

    bindClickNotas() {
        const doc = this.elements.partituraFrame.contentDocument;
        if (!doc) return;

        // Remove listener anterior se existir
        if (this._viewClickHandler) {
            doc.removeEventListener('click', this._viewClickHandler);
        }

        this._viewClickHandler = (e) => {
            const notaEl = e.target.closest('.vf-stavenote');
            if (!notaEl) return;

            const notas = Array.from(doc.querySelectorAll('.vf-stavenote'));
            const index = notas.indexOf(notaEl);
            if (index === -1) return;

            // Sempre seleciona
            this.partituraEditor.highlightIndex = index;
            this.partituraEditor.draw(this.elements.partituraFrame, false);

            // Se estiver tocando, também toca
            if (this.partituraPlaybackIndex !== -1) {
                this.partituraPlaybackIndex = index;
                this.tocarNotaAtualPartitura();
                if (this.onNotaClicada) this.onNotaClicada();
            }
        };

        doc.addEventListener('click', this._viewClickHandler);

        // Cursor pointer via CSS (só uma vez)
        if (!doc.getElementById('nota-cursor-style')) {
            const style = doc.createElement('style');
            style.id = 'nota-cursor-style';
            style.innerHTML = '.vf-stavenote { cursor: pointer; }';
            doc.head.appendChild(style);
        }
    }

    async loadSounds() {
        const loadPromises = [];

        Object.values(this.partituraEditor.basePitches).flat().forEach(nota => {
            const name = this.instrumento + '_' + nota.replace('/', '').replace('#', '_');
            const url = `${this.audioPath}/${name}.ogg`;

            loadPromises.push((async () => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) return; // arquivo não existe, ignora silenciosamente
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.buffers.set(name, audioBuffer);
                } catch (e) {
                    console.warn(`Som não encontrado: ${name}`);
                }
            })());
        });

        await Promise.all(loadPromises);
    }

    playSound(instrumento, notaLimpa, oitava, volume = 1, attack = 0) {
        const name = `${instrumento}_${notaLimpa}${oitava}`;
        const buffer = this.buffers.get(name);

        if (!buffer) {
            console.warn(`Buffer não encontrado: ${name}`);
            return;
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        // Usa currentTime para agendamento preciso (igual ao MelodyMachine)
        const now = this.audioContext.currentTime;

        // Começa em 0 e rampa suavemente — elimina o tic
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + attack);

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(now);

        // Guarda source + gainNode juntos para stop suave (igual ao MelodyMachine)
        const noteEntry = { source, gainNode };
        this.activeSources.push(noteEntry);

        source.onended = () => {
            this.activeSources = this.activeSources.filter(item => item !== noteEntry);
            source.disconnect();
            gainNode.disconnect();
        };

        return noteEntry;
    }

    stop() {
        // Fade-out suave em todas as notas ativas (igual ao MelodyMachine)
        const now = this.audioContext.currentTime;
        this.activeSources.forEach(({ source, gainNode }) => {
            try {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setTargetAtTime(0, now, 0.02);
                source.stop(now + 0.1);
            } catch (e) { }
        });
        this.activeSources = [];
        //this.partituraPlaybackIndex = -1;
    }

    tocarNotaAtualPartitura(volume = 1) {
        const data = this.partituraEditor.currentData[this.partituraPlaybackIndex];
        if (!data) return;

        this.stop();
        if (!data.rest) {
            data.notes.forEach(n => {
                const [nota, oitava] = n.split('/');
                const notaLimpa = nota.toLowerCase().replace('#', '_');
                this.playSound(this.instrumento, notaLimpa, oitava, volume);
            });
        }

        if (data.chord) {
            this.cifraPlayer.tocarAcorde(data.chord);
        }

        this.partituraEditor.highlightIndex = this.partituraPlaybackIndex;
        this.partituraEditor.draw(this.elements.partituraFrame, false);
        // bindClickNotas é chamado via onViewDrawn automaticamente pelo draw()
    }

    avancarNotaAtualPartitura() {
        if (this.partituraPlaybackIndex < this.partituraEditor.currentData.length - 1) {
            this.partituraPlaybackIndex++;
            this.tocarNotaAtualPartitura();
        }
    }

    retrocederNotaAtualPartitura() {
        if (this.partituraPlaybackIndex > 0) {
            this.partituraPlaybackIndex--;
            this.tocarNotaAtualPartitura();
        }
    }
}