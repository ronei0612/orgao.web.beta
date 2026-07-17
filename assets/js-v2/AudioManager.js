class AudioManager {
    constructor() {
        // Inicializa o motor de áudio nativo do navegador
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.buffers = {}; // Memória cache para não baixar a mesma nota duas vezes
        this.activeNodes = []; // Guarda os sons tocando agora para poder fazer o fade-out

        this.baseURL = "https://roneicostasoares.com.br/orgao.web.beta/assets/audio/";

        // Dicionário cromático para matemática musical
        this.chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }

    // Acorda o motor de áudio (Navegadores bloqueiam áudio até o usuário clicar na tela)
    async resumeContext() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    // Normaliza Bemóis (b) para Sustenidos (#) e prepara para o nome do arquivo (_)
    normalizeNoteForFile(noteStr) {
        let note = noteStr.toUpperCase();
        const enarmonics = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
        if (enarmonics[note]) note = enarmonics[note];

        return note.toLowerCase().replace('#', '_');
    }

    // Pega a nota base e devolve o índice matemático dela (0 a 11)
    getNoteIndex(noteStr) {
        let note = noteStr.toUpperCase();
        const enarmonics = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
        if (enarmonics[note]) note = enarmonics[note];
        return this.chromaticScale.indexOf(note);
    }

    // Identifica quais notas formam o acorde pela cifra
    getChordIntervals(suffix) {
        if (!suffix) return [0, 4, 7]; // Maior (C)
        if (suffix.includes('m7b5')) return [0, 3, 6, 10]; // Meio diminuto
        if (suffix.includes('dim') || suffix.includes('°')) return [0, 3, 6, 9]; // Diminuto
        if (suffix.includes('m7')) return [0, 3, 7, 10]; // Menor com 7ª
        if (suffix.includes('maj7') || suffix.includes('7M')) return [0, 4, 7, 11]; // Maior com 7M
        if (suffix.includes('m')) return [0, 3, 7]; // Menor
        if (suffix.includes('sus4') || suffix.includes('sus')) return [0, 5, 7]; // Sus4
        if (suffix.includes('sus2')) return [0, 2, 7]; // Sus2
        if (suffix.includes('aug') || suffix.includes('+')) return [0, 4, 8]; // Aumentado
        if (suffix.includes('7')) return [0, 4, 7, 10]; // Dominante 7ª

        return [0, 4, 7]; // Fallback para maior
    }

    // Quebra a string "Am7/G" em pedaços lógicos
    parseChord(chordStr) {
        const match = chordStr.match(/^([CDEFGAB][#b]?)(.*?)(?:\/([CDEFGAB][#b]?))?$/i);
        if (!match) return null;

        return {
            root: match[1],
            suffix: match[2],
            bass: match[3] || match[1] // Se não tiver baixo invertido, o baixo é a tônica
        };
    }

    // Monta a orquestra! Decide quais arquivos tocar baseado na Fase
    buildPlayList(chordStr, phase) {
        const parsed = this.parseChord(chordStr);
        if (!parsed) return [];

        const rootIndex = this.getNoteIndex(parsed.root);
        const bassIndex = this.getNoteIndex(parsed.bass);
        const intervals = this.getChordIntervals(parsed.suffix);

        let playlist = [];

        // 1. O BAIXO (Sempre na Oitava 3)
        const bassFileNote = this.normalizeNoteForFile(parsed.bass);
        playlist.push({ instrument: 'Orgao', fileName: `orgao_${bassFileNote}3.ogg` });
        if (phase >= 2) {
            playlist.push({ instrument: 'Strings', fileName: `strings_${bassFileNote}3.ogg` });
        }

        // 2. O ACORDE (Oitava 4)
        intervals.forEach(interval => {
            let noteAbs = rootIndex + interval;
            let octaveOffset = Math.floor(noteAbs / 12); // Se passar de B, sobe uma oitava para não voltar o som grave
            let noteClassIndex = noteAbs % 12;
            let noteFile = this.normalizeNoteForFile(this.chromaticScale[noteClassIndex]);

            // Fase 1: Só Órgão na oitava 4
            playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}${4 + octaveOffset}.ogg` });

            // Fase 2 e 3: Adiciona Strings na oitava 4
            if (phase >= 2) {
                playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}${4 + octaveOffset}.ogg` });
            }

            // Fase 3: Adiciona Órgão e Strings na oitava 5
            if (phase === 3) {
                // Prevenção: só sobe pra 5 se a nota base (4) não for virar 6 (limitando para não estourar arquivos inexistentes)
                if (4 + octaveOffset === 4) {
                    playlist.push({ instrument: 'Orgao', fileName: `orgao_${noteFile}5.ogg` });
                    playlist.push({ instrument: 'Strings', fileName: `strings_${noteFile}5.ogg` });
                }
            }
        });

        return playlist;
    }

    // Faz o download do arquivo ou pega do Cache da memória
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
            console.warn(`Aviso: Arquivo de áudio não encontrado no servidor: ${url}`);
            return null;
        }
    }

    // Para todos os sons gradativamente (Reverb natural da igreja)
    stopAll() {
        const fadeOutTime = 0.2;

        this.activeNodes.forEach(node => {
            try {
                // Pega o volume atual e joga pra 0
                node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, this.ctx.currentTime);
                node.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOutTime);

                node.source.stop(this.ctx.currentTime + fadeOutTime + 0.1);
            } catch (e) { }
        });

        this.activeNodes = []; // Limpa a lista
    }

    // Toca a cifra escolhida
    async playChord(chordStr, phase) {
        await this.resumeContext();

        // Corta os sons antigos (troca de cifra)
        this.stopAll();

        const playlist = this.buildPlayList(chordStr, phase);

        playlist.forEach(async (item) => {
            const url = `${this.baseURL}${item.instrument}/${item.fileName}`;
            const buffer = await this.getAudioBuffer(url);

            if (buffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;

                // Cria controlador de volume para Fade
                const gainNode = this.ctx.createGain();

                // Balanceamento: Strings um pouco mais baixo que o Órgão para não abafar
                let baseVolume = 1.0;
                //const baseVolume = item.instrument === 'Strings' ? 0.6 : 0.8;

                // Fade In super rápido (para não estourar a caixa de som = Efeito Attack)
                gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(baseVolume, this.ctx.currentTime + 0.1);

                source.connect(gainNode);
                gainNode.connect(this.ctx.destination);

                source.start(0);

                // Guarda na lista para o Stop
                this.activeNodes.push({ source, gainNode });
            }
        });
    }
}