class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.buffers = {}; // Memória RAM

        // Isolamento de canais de áudio
        this.activeChordNodes = [];
        this.activeFluteNodes = [];
        this.activePianoFluteNodes = {};

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
        const octaves = [2, 3, 4];
        const instruments = ['Orgao', 'Strings'];

        const urlsToFetch = [];

        // Preload de Órgão e Strings
        instruments.forEach(inst => {
            octaves.forEach(oct => {
                fileNotes.forEach(note => {
                    const instPrefix = inst === 'Orgao' ? 'orgao' : 'strings';
                    urlsToFetch.push(`${this.baseURL}${inst}/${instPrefix}_${note}${oct}.ogg`);
                });
            });
        });

        // Preload de Flauta (Oitavas 4, 5 e 6)
        const fluteOctaves = [4, 5, 6];
        fluteOctaves.forEach(oct => {
            fileNotes.forEach(note => {
                urlsToFetch.push(`${this.baseURL}studio/Flauta/flauta_${note}${oct}.ogg`);
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

        const bassFileNote = this.normalizeNoteForFile(parsed.bass);
        playlist.push({ instrument: 'Orgao', fileName: `orgao_${bassFileNote}2.ogg` });
        if (phase >= 2) {
            playlist.push({ instrument: 'Strings', fileName: `strings_${bassFileNote}2.ogg` });
        }

        intervals.forEach(interval => {
            let noteAbs = rootIndex + interval;
            let noteClassIndex = noteAbs % 12;
            let noteFile = this.normalizeNoteForFile(this.chromaticScale[noteClassIndex]);

            playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}3.ogg` });

            if (phase >= 2) {
                playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}3.ogg` });
            }

            if (phase === 3) {
                playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}4.ogg` });
                playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}4.ogg` });
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

    // --- CONTROLE DOS CHANNELS DE ÁUDIO ---

    stopChordLoop() {
        this.activeChordNodes.forEach(node => {
            try {
                const currentGain = node.gainNode.gain.value;
                node.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
                node.gainNode.gain.setValueAtTime(currentGain, this.ctx.currentTime);
                node.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + this.releaseTime);
                node.source.stop(this.ctx.currentTime + this.releaseTime + 0.05);
            } catch (e) { }
        });
        this.activeChordNodes = [];
    }

    stopActiveFluteNotes() {
        this.activeFluteNodes.forEach(node => {
            try {
                const currentGain = node.gainNode.gain.value;
                node.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
                node.gainNode.gain.setValueAtTime(currentGain, this.ctx.currentTime);
                node.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + this.releaseTime);
                node.source.stop(this.ctx.currentTime + this.releaseTime + 0.05);
            } catch (e) { }
        });
        this.activeFluteNodes = [];
    }

    stopAll() {
        this.stopChordLoop();
        this.stopActiveFluteNotes();
        Object.keys(this.activePianoFluteNodes).forEach(note => {
            this.stopPianoFluteNote(note);
        });
    }

    // --- EMISSÃO DOS SONS ---

    async playChord(chordStr, phase) {
        await this.resumeContext();
        this.stopChordLoop(); // Só encerra os loops do órgão e string

        const playlist = this.buildPlayList(chordStr, phase);
        if (playlist.length === 0) return;

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
            source.loop = true; // Órgão e strings tocam em loop contínuo!

            const gainNode = this.ctx.createGain();
            let baseVolume = 1.0;
            baseVolume = instrument === 'Strings' ? baseVolume / 1.25 : baseVolume;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + this.attackTime);

            source.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            source.start(startTime);

            this.activeChordNodes.push({ source, gainNode });
        });
    }

    async playFluteNote(noteStr) {
        await this.resumeContext();
        this.stopActiveFluteNotes();

        const parts = noteStr.split('/');
        const fileNote = this.normalizeNoteForFile(parts[0]);
        const octave = parts[1];
        const fileName = `flauta_${fileNote}${octave}.ogg`;
        const url = `${this.baseURL}studio/Flauta/${fileName}`;

        const buffer = await this.getAudioBuffer(url);
        if (!buffer) return;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = false; // Toque longo, sem loop infinito

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 0.1);

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(this.ctx.currentTime);

        this.activeFluteNodes.push({ source, gainNode });
    }

    // --- FLUTA DE TECLADO (SUSTAIN E RELEASE NATÍVEIS) ---

    async startPianoFluteNote(noteAndOctave) {
        await this.resumeContext();

        if (this.activePianoFluteNodes[noteAndOctave]) return; // Evita loopings se já estiver ativo

        const match = noteAndOctave.match(/^([CDEFGAB][#b]?)(\d)$/i);
        if (!match) return;

        const fileNote = this.normalizeNoteForFile(match[1]);
        const octave = match[2];
        const fileName = `flauta_${fileNote}${octave}.ogg`;
        const url = `${this.baseURL}studio/Flauta/${fileName}`;

        const buffer = await this.getAudioBuffer(url);
        if (!buffer) return;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = false;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 0.05); // Attack rápido

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(this.ctx.currentTime);

        this.activePianoFluteNodes[noteAndOctave] = { source, gainNode };
    }

    stopPianoFluteNote(noteAndOctave) {
        const node = this.activePianoFluteNodes[noteAndOctave];
        if (node) {
            try {
                const currentGain = node.gainNode.gain.value;
                node.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
                node.gainNode.gain.setValueAtTime(currentGain, this.ctx.currentTime);
                node.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + this.releaseTime); // Release suave de 0.2s
                node.source.stop(this.ctx.currentTime + this.releaseTime + 0.05);
            } catch (e) { }
            delete this.activePianoFluteNodes[noteAndOctave];
        }
    }
}