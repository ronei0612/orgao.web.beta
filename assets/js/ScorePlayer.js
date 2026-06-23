class ScorePlayer {
    constructor(elements, chordSheetPlayer, scoreEditor, baseUrl, audioManager) {
        this.audioPath = `${baseUrl}/assets/audio/studio/Flauta`;
        this.instrumento = 'flauta';
        this.elements = elements;
        this.chordSheetPlayer = chordSheetPlayer;
        this.scoreEditor = scoreEditor;
        this.partituraPlaybackIndex = -1;
        this.buffers = new Map();
        this.audioManager = audioManager;
        this.audioContext = audioManager.audioContext; 
        this.activeSources = new Set();
        this._initialized = false;
    }

    async init() {
        if (this._initialized) return;

        // CORREÇÃO: Marca como inicializado para não baixar os sons duas vezes
        this._initialized = true;

        await this.loadSounds();

        // Registra callback para bindar cliques sempre que a visualização for redesenhada
        this.scoreEditor.onViewDrawn = () => this.bindClickNotas();
    }

    setInstrument(inst) {
        this.instrumento = inst; // Recebe 'flauta' ou 'epiano'
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
            this.scoreEditor.highlightIndex = index;
            this.scoreEditor.draw(this.elements.partituraFrame, false);

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
                Object.values(this.scoreEditor.basePitches).flat()
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
        const data = this.scoreEditor.currentData[this.partituraPlaybackIndex];
        if (!data) return;

        this.audioManager.stopAll(this.activeSources, 0.02);

        if (data.chord) {
            this.chordSheetPlayer.tocarAcorde(data.chord);
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
                const bufferName = `${this.instrumento}_${notaLimpa}${oitava}`;
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

        this.scoreEditor.highlightIndex = this.partituraPlaybackIndex;
        this.scoreEditor.draw(frameParaDesenhar, frameParaDesenhar === this.elements.partituraEditFrame);
    }

    startPianoNote(pitch) {
        this.stopPianoNote();
        if (!pitch) return;

        const [nota, oitava] = pitch.split('/');
        let notaConvertida = nota.toLowerCase();

        const mapBemolParaSustenido = { 'db': 'c#', 'eb': 'd#', 'gb': 'f#', 'ab': 'g#', 'bb': 'a#' };
        if (mapBemolParaSustenido[notaConvertida]) {
            notaConvertida = mapBemolParaSustenido[notaConvertida];
        }

        const notaLimpa = notaConvertida.replace('#', '_');
        let bufferName = '';
        let buffer = null;

        // Se for Epiano, ele procura os OGGs na memória do ChordSheetPlayer
        if (this.instrumento === 'epiano') {
            let sufixo = '';
            if (oitava === '3') sufixo = '_grave';
            else if (oitava === '4') sufixo = '_baixo';

            bufferName = `epiano_${notaLimpa}${sufixo}`;
            buffer = this.chordSheetPlayer.buffers.get(bufferName);
        } else {
            // Senão, é a flauta padrão
            bufferName = `flauta_${notaLimpa}${oitava}`;
            buffer = this.buffers.get(bufferName);
        }

        if (buffer) {
            this.activePianoNode = this.audioManager.playNode(buffer, this.audioContext.currentTime, 1, 0.02, false, this.activeSources);
        }
    }

    // Interrompe a nota OGG suavemente (Note Off)
    stopPianoNote() {
        if (this.activePianoNode) {
            // Faz um fade-out suave (0.15s) para o som da flauta não cortar seco
            this.audioManager.stopNode(this.activePianoNode, this.audioContext.currentTime, 0.15);
            this.activePianoNode = null;
        }
    }

    avancarNotaAtualPartitura() {
        if (this.partituraPlaybackIndex < this.scoreEditor.currentData.length - 1) {
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