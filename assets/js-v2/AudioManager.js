class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.buffers = {}; // Memória RAM
        this.activeNodes = [];
        this.baseURL = "https://roneicostasoares.com.br/orgao.web.beta/assets/audio/";

        this.chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.enarmonics = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };

        this.isPreloaded = false;

        this.attackTime = 0.2;
        this.releaseTime = 0.2;
    }

    async resumeContext() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

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

        Promise.allSettled(urlsToFetch.map(url => this.getAudioBuffer(url))).then(() => {
            this.isPreloaded = true;
        });
    }

    normalizeNoteForFile(noteStr) {
        let note = noteStr.toUpperCase();
        if (this.enarmonics[note]) note = this.enarmonics[note];
        return note.toLowerCase().replace('#', '_');
    }

    getNoteIndex(noteStr) {
        let note = noteStr.toUpperCase();
        if (this.enarmonics[note]) note = this.enarmonics[note];
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
        const cleanChord = chordStr.replace(/\s+/g, '');
        const match = cleanChord.match(/^([CDEFGAB][#b]?)(.*?)(?:\/([CDEFGAB][#b]?))?$/i);

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

        // 2. ACORDE (Oitavas 4 e 5 - Comportamento de Teclado Arranjador Compacto)
        intervals.forEach(interval => {
            let noteAbs = rootIndex + interval;
            let noteClassIndex = noteAbs % 12; // Pega apenas o nome da nota (0 a 11)
            let noteFile = this.normalizeNoteForFile(this.chromaticScale[noteClassIndex]);

            // Fase 1 e 2: Todas as notas cravadas na oitava 4 (antigo _baixo)
            playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}4.ogg` });

            if (phase >= 2) {
                playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}4.ogg` });
            }

            // Fase 3: Todas as notas cravadas na oitava 5 (antigo arquivo sem sufixo)
            if (phase === 3) {
                playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}5.ogg` });
                playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}5.ogg` });
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
            console.warn(`Aviso: Áudio ignorado ou ausente: ${url}`);
            return null;
        }
    }

    stopAll() {
        this.activeNodes.forEach(node => {
            try {
                const currentGain = node.gainNode.gain.value;
                node.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
                node.gainNode.gain.setValueAtTime(currentGain, this.ctx.currentTime);

                // ---> AJUSTE PONTO 2: O RELEASE GERAL DE 0.2s <---
                node.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + this.releaseTime);
                node.source.stop(this.ctx.currentTime + this.releaseTime + 0.05);
            } catch (e) { }
        });
        this.activeNodes = [];
    }

    async playChord(chordStr, phase) {
        await this.resumeContext();
        this.stopAll();

        const playlist = this.buildPlayList(chordStr, phase);
        if (playlist.length === 0) return;

        // console.log(`\n🔵 [MOTOR NOVO] Acorde: ${chordStr} | Fase: ${phase}`);
        // playlist.forEach(item => {
        //     console.log(`   -> ${item.instrument}: ${item.fileName}`);
        // });

        const loadedSamples = await Promise.all(playlist.map(async (item) => {
            const url = `${this.baseURL}${item.instrument}/${item.fileName}`;
            const buffer = await this.getAudioBuffer(url);
            return { buffer, instrument: item.instrument };
        }));

        const startTime = this.ctx.currentTime + 0.01;

        loadedSamples.forEach(({ buffer, instrument }) => {
            if (!buffer) return;

            const source = this.ctx.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.ctx.createGain();
            let baseVolume = 1.0;
            baseVolume = instrument === 'Strings' ? baseVolume / 1.25 : baseVolume;

            gainNode.gain.setValueAtTime(0, startTime);

            // ---> AJUSTE PONTO 2: O ATTACK LENTO (0.2s) PARA AMBOS OS INSTRUMENTOS <---
            gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + this.attackTime);

            source.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            source.start(startTime);

            this.activeNodes.push({ source, gainNode });
        });
    }
}