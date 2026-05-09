class PartituraPlayer {
    constructor(elements, cifraPlayer, partituraEditor) {
        //this.audioPath = `${baseUrl}/assets/audio/`;
        //this.uiController = uiController;
        //this.musicTheory = musicTheory;
        this.elements = elements;
        this.cifraPlayer = cifraPlayer;
        this.partituraEditor = partituraEditor;
        this.partituraPlaybackIndex = -1;
        //this.audioContextManager = new AudioContextManager();
        //this.carregarAcordes();
    }

    tocarNotaAtualPartitura() {
        const data = this.partituraEditor.currentData[this.partituraPlaybackIndex];
        if (!data) return;

        // 1. Som da Nota Melódica
        data.notes.forEach(n => {
            // Traduz "c/4" -> "c" oitava "baixo"
            const [nota, oitavaNum] = n.split('/');
            let sufixo = "";
            if (oitavaNum === "3") sufixo = "grave";
            if (oitavaNum === "4") sufixo = "baixo";
            // oitava 5 é a padrão (vazio)

            const notaLimpa = nota.toLowerCase().replace('#', '_');
            //this.cifraPlayer.adicionarSom(this.cifraPlayer.instrumento, notaLimpa, sufixo);
        });

        // 2. Som do Acorde (se houver [C] na nota)
        if (data.chord) {
            this.cifraPlayer.tocarAcorde(data.chord);
        } else {
            this.cifraPlayer.audioContextManager.play(this.cifraPlayer.attack);
        }

        // 3. Visual: Atualiza o destaque no Iframe
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
