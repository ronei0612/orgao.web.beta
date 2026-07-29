class MusicTheory {
    constructor() {
        this.notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        // Para transposição, usamos os sustenidos como padrão de exibição
        this.sharpNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.pianoPattern = [
            { index: 0, type: 'white' }, { index: 1, type: 'black' },
            { index: 2, type: 'white' }, { index: 3, type: 'black' },
            { index: 4, type: 'white' }, { index: 5, type: 'white' },
            { index: 6, type: 'black' }, { index: 7, type: 'white' },
            { index: 8, type: 'black' }, { index: 9, type: 'white' },
            { index: 10, type: 'black' }, { index: 11, type: 'white' }
        ];
    }

    getNoteByIndex(index) {
        const normalizedIndex = ((index % 12) + 12) % 12;
        return this.notes[normalizedIndex];
    }

    getNoteIndex(noteStr) {
        const enarmonics = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
        let n = noteStr.toUpperCase();
        if (enarmonics[n]) n = enarmonics[n];
        return this.sharpNotes.indexOf(n);
    }

    transposeNote(baseInterval, offset) {
        return this.getNoteByIndex(baseInterval + offset);
    }

    transposeChordString(chordStr, delta) {
        // Encontra notas individuais (incluindo baixo invertido ex: D/F#) e transpõe
        const regex = /([CDEFGAB][#b]?)/gi;
        return chordStr.replace(regex, (match) => {
            const idx = this.getNoteIndex(match);
            if (idx === -1) return match;
            const newIdx = ((idx + (delta % 12)) + 12) % 12;
            return this.sharpNotes[newIdx];
        });
    }

    getPianoPattern() {
        return this.pianoPattern.map(key => ({ note: this.notes[key.index], type: key.type }));
    }

    detectKeyFromChords(chordElements) {
        if (!chordElements || chordElements.length === 0) return "L";

        // 1. Verifica se o 1º acorde é menor
        const firstChordText = chordElements[0].innerText.trim();
        const firstMatch = firstChordText.match(/^([A-G][#b]?)(m)?(?!aj)/i);
        const isFirstChordMinor = !!(firstMatch && firstMatch[2]);

        // 2. Extrai notas fundamentais únicas
        const songRootsOrdered = [];
        const uniqueRoots = new Set();

        chordElements.forEach(el => {
            const text = el.innerText.trim();
            const match = text.match(/^([A-G][#b]?)/i);
            if (match) {
                const idx = this.getNoteIndex(match[1]);
                if (idx !== -1) {
                    songRootsOrdered.push(idx);
                    uniqueRoots.add(idx);
                }
            }
        });

        if (uniqueRoots.size === 0) return "L";

        // 3. Testa nos 12 Campos Harmônicos Maiores
        const diatonicIntervals = [0, 2, 4, 5, 7, 9, 11];
        const keyScores = [];

        for (let key = 0; key < 12; key++) {
            const keyNotes = diatonicIntervals.map(interval => (key + interval) % 12);
            let count = 0;
            uniqueRoots.forEach(root => {
                if (keyNotes.includes(root)) count++;
            });
            keyScores.push({ key, count });
        }

        const maxCount = Math.max(...keyScores.map(s => s.count));
        const topCandidates = keyScores.filter(s => s.count === maxCount).map(s => s.key);

        let winningKeyIndex = topCandidates[0];

        // Desempate por ordem de aparição na música
        for (let rootNote of songRootsOrdered) {
            if (topCandidates.includes(rootNote)) {
                winningKeyIndex = rootNote;
                break;
            }
        }

        const noteName = this.sharpNotes[winningKeyIndex];
        return isFirstChordMinor ? `${noteName}m` : noteName;
    }
}

class ChordManager {
    constructor(toolbarController, musicTheory, audioManager) {
        this.toolbar = toolbarController;
        this.theory = musicTheory;
        this.audio = audioManager;

        this.chordBtns = document.querySelectorAll('.chord-btn');
        this.keySelect = document.getElementById('key-select');
        this.btnKeyDown = document.getElementById('btn-key-down');
        this.btnKeyUp = document.getElementById('btn-key-up');

        this.init();
    }

    init() {
        this.populateKeySelect();

        // Garante que inicia em "C" e preenche o texto dos botões
        if (this.keySelect && (!this.keySelect.value || this.keySelect.value === "0")) {
            this.keySelect.value = "C";
        }
        this.transposeChords(this.keySelect?.value || "C");

        this.toolbar.onStop(() => this.clearActiveChords());

        this.chordBtns.forEach(btn => btn.addEventListener('click', () => this.handleChordClick(btn)));

        if (this.keySelect) {
            this.keySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val !== "L") {
                    this.transposeChords(val);
                }
            });
        }

        this.btnKeyDown?.addEventListener('click', () => this.changeKeyStep(-1));
        this.btnKeyUp?.addEventListener('click', () => this.changeKeyStep(1));
    }

    populateKeySelect(isMinor = false) {
        if (!this.keySelect) return;
        const currentVal = this.keySelect.value;
        this.keySelect.innerHTML = '';

        const optLetra = document.createElement('option');
        optLetra.value = "L";
        optLetra.textContent = "Letra";
        this.keySelect.appendChild(optLetra);

        this.theory.notes.forEach((note) => {
            const val = isMinor ? `${note}m` : note;
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            this.keySelect.appendChild(option);
        });

        this.isMinorKey = isMinor;
        if (currentVal && currentVal !== "0") this.keySelect.value = currentVal;
    }

    changeKeyStep(step) {
        if (!this.keySelect || this.keySelect.value === "L") return;

        const currentVal = this.keySelect.value || "C";
        const match = String(currentVal).match(/^([A-G][#b]?)(m)?(?!aj)/i);
        const rootNote = match ? match[1] : "C";
        const isMinor = match ? !!match[2] : false;

        const currentIndex = this.theory.getNoteIndex(rootNote);
        const newIndex = (currentIndex + step + 12) % 12;
        const newNote = this.theory.getNoteByIndex(newIndex);
        const newVal = isMinor ? `${newNote}m` : newNote;

        this.keySelect.value = newVal;
        this.keySelect.dispatchEvent(new Event('change'));
    }

    // Método blindado: aceita números, textos, "C", "Am" ou "0" sem dar erro
    transposeChords(keyInput) {
        if (keyInput === null || keyInput === undefined || keyInput === "L") return;

        let rootNote = "C";
        let isMinor = false;

        if (typeof keyInput === "number") {
            rootNote = this.theory.getNoteByIndex(keyInput) || "C";
        } else if (typeof keyInput === "string") {
            if (!isNaN(keyInput) && keyInput.trim() !== "") {
                rootNote = this.theory.getNoteByIndex(parseInt(keyInput, 10)) || "C";
            } else {
                const match = keyInput.match(/^([A-G][#b]?)(m)?(?!aj)/i);
                if (match) {
                    rootNote = match[1];
                    isMinor = !!match[2];
                }
            }
        }

        const keyOffset = this.theory.getNoteIndex(rootNote);
        if (keyOffset === -1) return;

        // Se for menor, calcula com a relativa maior (+3 semitonos)
        const effectiveOffset = isMinor ? (keyOffset + 3) % 12 : keyOffset;

        this.chordBtns.forEach(btn => {
            const baseInterval = parseInt(btn.getAttribute('data-interval'), 10);
            const chordType = btn.getAttribute('data-type') || "";
            const newNote = this.theory.transposeNote(baseInterval, effectiveOffset);
            btn.innerText = `${newNote}${chordType}`;
        });
    }

    handleChordClick(btn) {
        const chordText = btn.innerText;
        const phase = this.toolbar.musicPhase;

        this.audio.playChord(chordText, phase);
        if (window.rhythmEngine) window.rhythmEngine.triggerChord(chordText, phase);

        if (btn.classList.contains('active')) {
            btn.classList.remove('repress-anim');
            void btn.offsetWidth;
            btn.classList.add('repress-anim');
        } else {
            this.clearActiveChords();
            btn.classList.add('active');
            if (!this.toolbar.isPlaying) {
                this.toolbar.setPlayState(true);
            }
        }
    }

    clearActiveChords() {
        this.chordBtns.forEach(b => {
            b.classList.remove('active');
            b.classList.remove('repress-anim');
        });
    }
}

class PianoManager {
    constructor(musicTheory) {
        this.theory = musicTheory;
        this.container = document.getElementById('piano-container');
        this.shadowLeft = document.querySelector('.scroll-shadow-left');
        this.shadowRight = document.querySelector('.scroll-shadow-right');

        this.isDown = false;
        this.startX = 0;
        this.scrollLeft = 0;
        this.activeKey = null;

        this.renderKeys();
        this.initEvents();
    }

    renderKeys() {
        const piano = document.getElementById('piano');
        if (!piano) return;
        piano.innerHTML = '';

        // Alterado de [3, 4, 5] para [4, 5] para começar em C4
        const octaves = [4, 5];
        const pattern = this.theory.getPianoPattern();

        octaves.forEach(octave => {
            pattern.forEach(n => {
                const key = document.createElement('div');
                key.className = `key ${n.type}`;
                key.innerHTML = `<span>${n.note}${octave}</span>`;
                piano.appendChild(key);
            });
        });

        // C6 Final
        const keyC6 = document.createElement('div');
        keyC6.className = 'key white';
        keyC6.innerHTML = '<span>C6</span>';
        piano.appendChild(keyC6);
    }

    initEvents() {
        if (!this.container) return;

        this.container.addEventListener('scroll', () => this.updateShadows());
        window.addEventListener('resize', () => this.updateShadows());
        setTimeout(() => this.updateShadows(), 100);

        this.container.addEventListener('mousedown', (e) => this.downAction(e.pageX, e.target));
        this.container.addEventListener('mousemove', (e) => this.moveAction(e.pageX));
        window.addEventListener('mouseup', () => this.upAction());

        this.container.addEventListener('touchstart', (e) => this.downAction(e.touches[0].pageX, e.target), { passive: true });
        this.container.addEventListener('touchmove', (e) => this.moveAction(e.touches[0].pageX), { passive: true });
        window.addEventListener('touchend', () => this.upAction());
    }

    downAction(pageX, target) {
        this.isDown = true;
        this.startX = pageX - this.container.offsetLeft;
        this.scrollLeft = this.container.scrollLeft;

        const key = target.closest('.key');
        if (key) {
            this.activeKey = key;
            key.classList.add('pressed');

            // Dispara o som de flauta com sustentação
            const noteText = key.querySelector('span')?.innerText;
            if (noteText && window.audioManager) {
                window.audioManager.startPianoFluteNote(noteText);
            }
        }
    }

    moveAction(pageX) {
        if (!this.isDown) return;
        const walk = (pageX - this.container.offsetLeft - this.startX);
        if (Math.abs(walk) > 5) {
            this.container.scrollLeft = this.scrollLeft - walk;
            if (this.activeKey) {
                this.activeKey.classList.remove('pressed');
                // Interrompe o som se o arrasto tirar o foco da tecla
                const noteText = this.activeKey.querySelector('span')?.innerText;
                if (noteText && window.audioManager) {
                    window.audioManager.stopPianoFluteNote(noteText);
                }
                this.activeKey = null;
            }
        }
    }

    upAction() {
        this.isDown = false;
        if (this.activeKey) {
            this.activeKey.classList.remove('pressed');

            // Finaliza o som de flauta com rampa de release suave ao soltar a tecla
            const noteText = this.activeKey.querySelector('span')?.innerText;
            if (noteText && window.audioManager) {
                window.audioManager.stopPianoFluteNote(noteText);
            }
            this.activeKey = null;
        }
    }

    updateShadows() {
        const maxScroll = this.container.scrollWidth - this.container.clientWidth;
        const currentScroll = this.container.scrollLeft;

        if (this.shadowLeft) this.shadowLeft.classList.toggle('d-none', currentScroll <= 0);
        if (this.shadowRight) this.shadowRight.classList.toggle('d-none', currentScroll >= maxScroll - 1 || maxScroll <= 0);
    }
}