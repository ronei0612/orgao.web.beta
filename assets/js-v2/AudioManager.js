class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.buffers = {}; // Memória RAM de áudios carregados
        this.activeNodes = [];
        this.baseURL = "https://roneicostasoares.com.br/orgao.web.beta/assets/audio/";
        this.chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.isPreloaded = false;
    }

    async resumeContext() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    // --- NOVO: PUXA TODOS OS ÁUDIOS PRA MEMÓRIA RAM ASSIM QUE O SITE ABRE ---
    async preloadAll() {
        if (this.isPreloaded) return;

        const fileNotes = ['c', 'c_', 'd', 'd_', 'e', 'f', 'f_', 'g', 'g_', 'a', 'a_', 'b'];
        const octaves = [3, 4, 5];
        const instruments = ['Orgao', 'Strings'];

        const urlsToFetch = [];

        instruments.forEach(inst => {
            octaves.forEach(oct => {
                fileNotes.forEach(note => {
                    const instPrefix = inst === 'Orgao' ? 'orgao' : 'strings';
                    urlsToFetch.push(`${this.baseURL}${inst}/${instPrefix}_${note}${oct}.ogg`);
                });
            });
        });

        // Baixa todos os 72 arquivos em segundo plano
        Promise.all(urlsToFetch.map(url => this.getAudioBuffer(url))).then(() => {
            this.isPreloaded = true;
            console.log("⚡ [ÁUDIO] Todos os sons do Órgão e Strings estão carregados na memória RAM!");
        });
    }

    normalizeNoteForFile(noteStr) {
        let note = noteStr.toUpperCase();
        const enarmonics = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
        if (enarmonics[note]) note = enarmonics[note];
        return note.toLowerCase().replace('#', '_');
    }

    getNoteIndex(noteStr) {
        let note = noteStr.toUpperCase();
        const enarmonics = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
        if (enarmonics[note]) note = enarmonics[note];
        return this.chromaticScale.indexOf(note);
    }

    getChordIntervals(suffix) {
        if (!suffix) return [0, 4, 7];
        if (suffix.includes('m7b5')) return [0, 3, 6, 10];
        if (suffix.includes('dim') || suffix.includes('°')) return [0, 3, 6, 9];
        if (suffix.includes('m7')) return [0, 3, 7, 10];
        if (suffix.includes('maj7') || suffix.includes('7M')) return [0, 4, 7, 11];
        if (suffix.includes('m')) return [0, 3, 7];
        if (suffix.includes('sus4') || suffix.includes('sus')) return [0, 5, 7];
        if (suffix.includes('sus2')) return [0, 2, 7];
        if (suffix.includes('aug') || suffix.includes('+')) return [0, 4, 8];
        if (suffix.includes('7')) return [0, 4, 7, 10];
        return [0, 4, 7];
    }

    parseChord(chordStr) {
        const match = chordStr.match(/^([CDEFGAB][#b]?)(.*?)(?:\/([CDEFGAB][#b]?))?$/i);
        if (!match) return null;
        return { root: match[1], suffix: match[2], bass: match[3] || match[1] };
    }

    buildPlayList(chordStr, phase) {
        const parsed = this.parseChord(chordStr);
        if (!parsed) return [];

        const rootIndex = this.getNoteIndex(parsed.root);
        const intervals = this.getChordIntervals(parsed.suffix);

        let playlist = [];

        // 1. BAIXO (Oitava 3)
        const bassFileNote = this.normalizeNoteForFile(parsed.bass);
        playlist.push({ instrument: 'Orgao', fileName: `orgao_${bassFileNote}3.ogg` });
        if (phase >= 2) {
            playlist.push({ instrument: 'Strings', fileName: `strings_${bassFileNote}3.ogg` });
        }

        // 2. ACORDE (Oitavas 4 e 5)
        intervals.forEach(interval => {
            let noteAbs = rootIndex + interval;
            let octaveOffset = Math.floor(noteAbs / 12);
            let noteClassIndex = noteAbs % 12;
            let noteFile = this.normalizeNoteForFile(this.chromaticScale[noteClassIndex]);

            playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}${4 + octaveOffset}.ogg` });

            if (phase >= 2) {
                playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}${4 + octaveOffset}.ogg` });
            }

            if (phase === 3) {
                if (4 + octaveOffset === 4) {
                    playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}5.ogg` });
                    playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}5.ogg` });
                }
            }
        });

        return playlist;
    }

    async getAudioBuffer(url) {
        if (this.buffers[url]) return this.buffers[url];

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Audio não encontrado");
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[url] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.warn(`Aviso: Arquivo de áudio não encontrado: ${url}`);
            return null;
        }
    }

    stopAll() {
        const fadeOutTime = 0.4;
        this.activeNodes.forEach(node => {
            try {
                node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, this.ctx.currentTime);
                node.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOutTime);
                node.source.stop(this.ctx.currentTime + fadeOutTime + 0.05);
            } catch (e) { }
        });
        this.activeNodes = [];
    }

    // --- TOCAR ACORDE INSTANTÂNEO ---
    async playChord(chordStr, phase) {
        await this.resumeContext();
        this.stopAll();

        const playlist = this.buildPlayList(chordStr, phase);

        // 1. Pega todas as notas salvas da RAM em paralelo
        const loadedSamples = await Promise.all(playlist.map(async (item) => {
            const url = `${this.baseURL}${item.instrument}/${item.fileName}`;
            const buffer = await this.getAudioBuffer(url);
            return { buffer, instrument: item.instrument };
        }));

        // 2. Dispara TODAS no mesmo instante atômico da placa de som
        const startTime = this.ctx.currentTime + 0.01; // 10ms de sincronização perfeita

        loadedSamples.forEach(({ buffer, instrument }) => {
            if (!buffer) return;

            const source = this.ctx.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.ctx.createGain();
            let baseVolume = 1.0;
            //const baseVolume = instrument === 'Strings' ? 0.5 : 0.8;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + 0.05);

            source.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            source.start(startTime);

            this.activeNodes.push({ source, gainNode });
        });
    }
}