class PartituraPlayer {
    constructor(elements, cifraPlayer, partituraEditor, baseUrl, audioManager) {
        this.audioPath = `${baseUrl}/assets/audio/studio/Flauta`;
        this.instrumento = 'flauta';
        this.elements = elements;
        this.cifraPlayer = cifraPlayer;
        this.partituraEditor = partituraEditor;
        this.partituraPlaybackIndex = -1;
        this.buffers = new Map();
        this.audioManager = audioManager;
        this.audioContext = audioManager.audioContext;
        this.activeSources = new Set(); // Fontes de áudio da partitura
        this.pianoActiveSources = new Set(); // NOVO: Fontes de áudio EXCLUSIVAS do teclado
        this._initialized = false;
    }

    async init() {
        if (this._initialized) return;

        // CORREÇÃO: Marca como inicializado para não baixar os sons duas vezes
        this._initialized = true;

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
        try {
            const notas = [...new Set(
                Object.values(this.partituraEditor.basePitches).flat()
            )];
            const urls = Object.fromEntries(
                notas.map(nota => {
                    const name = `${this.instrumento}_${nota.replace('/', '').replace('#', '_')}`;
                    return [name, `${this.audioPath}/${name}.ogg`];
                })
            );
            this.buffers = await this.audioManager.loadBuffers(urls);
        } catch { }
    }

    tocarNotaAtualPartitura(volume = 1) {
        const data = this.partituraEditor.currentData[this.partituraPlaybackIndex];
        if (!data) return;

        this.audioManager.stopAll(this.activeSources, 0.02);

        if (data.chord) {
            this.cifraPlayer.tocarAcorde(data.chord);
        }

        if (!data.rest) {
            data.notes.forEach(n => {
                const [nota, oitava] = n.split('/');
                let notaConvertida = nota.toLowerCase();

                const mapBemolParaSustenido = { 'db': 'c#', 'eb': 'd#', 'gb': 'f#', 'ab': 'g#', 'bb': 'a#' };
                if (mapBemolParaSustenido[notaConvertida]) {
                    notaConvertida = mapBemolParaSustenido[notaConvertida];
                }

                const notaLimpa = notaConvertida.replace('#', '_');

                // SEMPRE FLAUTA na partitura
                const bufferName = `flauta_${notaLimpa}${oitava}`;
                const buffer = this.buffers.get(bufferName);

                if (buffer) {
                    this.audioManager.playNode(buffer, this.audioContext.currentTime, volume, 0.02, false, this.activeSources);
                }
            });
        }

        // CORREÇÃO: Identifica qual iframe deve ser redesenhado com o destaque azul
        const frameParaDesenhar = !this.elements.partituraEditFrame.classList.contains('d-none')
            ? this.elements.partituraEditFrame
            : this.elements.partituraFrame;

        this.partituraEditor.highlightIndex = this.partituraPlaybackIndex;
        this.partituraEditor.draw(frameParaDesenhar, frameParaDesenhar === this.elements.partituraEditFrame);
    }

    startPianoNote(pitch) {
        this.audioManager.stopAll(this.pianoActiveSources, 0.02);
        this.activePianoNode = null;
        this.activePianoNodeStartTime = null;

        if (!pitch) return;

        const [nota, oitava] = pitch.split('/');
        let notaConvertida = nota.toLowerCase();

        const mapBemolParaSustenido = { 'db': 'c#', 'eb': 'd#', 'gb': 'f#', 'ab': 'g#', 'bb': 'a#' };
        if (mapBemolParaSustenido[notaConvertida]) {
            notaConvertida = mapBemolParaSustenido[notaConvertida];
        }

        const notaLimpa = notaConvertida.replace('#', '_');

        // SEMPRE FLAUTA no teclado virtual
        const bufferName = `flauta_${notaLimpa}${oitava}`;
        const buffer = this.buffers.get(bufferName);

        if (buffer) {
            this.activePianoNode = this.audioManager.playNode(buffer, this.audioContext.currentTime, 1, 0.02, false, this.pianoActiveSources);
            this.activePianoNodeStartTime = this.audioContext.currentTime;
        }
    }

    stopPianoNote() {
        if (this.activePianoNode) {
            const now = this.audioContext.currentTime;
            let stopTime = now;

            if (this.activePianoNodeStartTime) {
                const tempoDecorrido = now - this.activePianoNodeStartTime;
                const sustainMinimo = 0.5; // 500ms de duração mínima

                // Aplica o sustain mínimo APENAS se você levantou o dedo
                // (se você tocou outra nota, o startPianoNote mata a anterior antes de chegar aqui)
                if (tempoDecorrido < sustainMinimo) {
                    stopTime = this.activePianoNodeStartTime + sustainMinimo;
                }
            }

            this.audioManager.stopNode(this.activePianoNode, stopTime, 0.15);

            this.activePianoNode = null;
            this.activePianoNodeStartTime = null;
        }
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