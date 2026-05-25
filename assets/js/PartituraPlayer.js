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
        this.activeSources = new Set();
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
    }

    tocarNotaAtualPartitura(volume = 1) {
        const data = this.partituraEditor.currentData[this.partituraPlaybackIndex];
        if (!data) return;

        this.audioManager.stopAll(this.activeSources, 0.02);

        // Toca o acorde ANTES para compensar o attack do órgão
        if (data.chord) {
            this.cifraPlayer.tocarAcorde(data.chord);
        }

        //const previousData = this.partituraEditor.currentData[this.partituraPlaybackIndex - 1];
        //if (!data.rest && !(previousData && previousData.tie)) {
        // TODO: verificar se a nota anterior tem ligadura e se é a mesma nota para não tocar a nota atual
        if (!data.rest) {
            data.notes.forEach(n => {
                const [nota, oitava] = n.split('/');
                const notaLimpa = nota.toLowerCase().replace('#', '_');

                const bufferName = `${this.instrumento}_${notaLimpa}${oitava}`;
                const buffer = this.buffers.get(bufferName);

                if (buffer) {
                    this.audioManager.playNode(buffer, this.audioContext.currentTime, volume, 0.02, false, this.activeSources);
                }
            });
        }

        this.partituraEditor.highlightIndex = this.partituraPlaybackIndex;
        this.partituraEditor.draw(this.elements.partituraFrame, false);
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