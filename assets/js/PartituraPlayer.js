class PartituraPlayer {
    constructor(elements, cifraPlayer, partituraEditor, baseUrl) {
        this.audioPath = `${baseUrl}/assets/audio/studio/Flauta`;
        this.instrumento = 'flauta';
        this.elements = elements;
        this.cifraPlayer = cifraPlayer;
        this.partituraEditor = partituraEditor;
        this.partituraPlaybackIndex = -1;
        this.buffers = new Map();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.init();
    }

    async init() {
        await this.loadSounds();
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

    playSound(instrumento, notaLimpa, oitava) {
        const name = `${instrumento}_${notaLimpa}${oitava}`;
        const buffer = this.buffers.get(name);

        if (!buffer) {
            console.warn(`Buffer não encontrado: ${name}`);
            return;
        }

        // Retoma o contexto se estiver suspenso (política de autoplay dos browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
    }

    tocarNotaAtualPartitura() {
        const data = this.partituraEditor.currentData[this.partituraPlaybackIndex];
        if (!data) return;

        // 1. Som da Nota Melódica (ignora se for pausa)
        if (!data.rest) {
            data.notes.forEach(n => {
                const [nota, oitava] = n.split('/');
                const notaLimpa = nota.toLowerCase().replace('#', '_');
                this.playSound(this.instrumento, notaLimpa, oitava);
            });
        }

        // 2. Som do Acorde (se houver [C] na nota)
        if (data.chord) {
            this.cifraPlayer.tocarAcorde(data.chord);
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