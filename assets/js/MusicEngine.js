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
        this.transposeChords(0);

        this.toolbar.onStop(() => this.clearActiveChords());

        this.chordBtns.forEach(btn => btn.addEventListener('click', () => this.handleChordClick(btn)));

        if (this.keySelect) {
            this.keySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const currentContext = sessionStorage.getItem('app_context') || 'ACORDES';

                // CORREÇÃO: Salva a preferência do Tom APENAS nos menus gerais e NUNCA salva "Letra" (L)
                const allowedContextsToSave = ['ACORDES', 'LITURGIA', 'MISSA', 'ORACOES'];
                if (allowedContextsToSave.includes(currentContext) && val !== "L") {
                    sessionStorage.setItem(`key_${currentContext}`, val);
                }

                // Só transpõe os botões de acordes se não for "Letra"
                if (val !== "L") {
                    this.transposeChords(parseInt(val, 10));
                }
            });
        }

        this.btnKeyDown?.addEventListener('click', () => this.changeKeyStep(-1));
        this.btnKeyUp?.addEventListener('click', () => this.changeKeyStep(1));
    }

    populateKeySelect() {
        if (!this.keySelect) return;
        this.keySelect.innerHTML = '';

        // Adiciona a Opção Especial de Letra
        const optLetra = document.createElement('option');
        optLetra.value = "L";
        optLetra.textContent = "Letra";
        this.keySelect.appendChild(optLetra);

        this.theory.notes.forEach((note, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = note;
            this.keySelect.appendChild(option);
        });
        this.keySelect.value = "0";
    }

    handleChordClick(btn) {
        const chordText = btn.innerText;
        const phase = this.toolbar.musicPhase;

        // Toca Loop de Cifra + Dispara o Ritmo arranjador (Sync-Start)
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

    changeKeyStep(step) {
        if (this.keySelect.value === "L") return; // Ignora se estiver no modo letra

        const currentValue = parseInt(this.keySelect.value, 10);
        const newOffset = (currentValue + step + 12) % 12;
        this.keySelect.value = newOffset;

        // Dispara o evento de "change" pra avisar o resto do app
        this.keySelect.dispatchEvent(new Event('change'));
    }

    transposeChords(keyOffset) {
        this.chordBtns.forEach(btn => {
            const baseInterval = parseInt(btn.getAttribute('data-interval'), 10);
            const chordType = btn.getAttribute('data-type');
            const newNote = this.theory.transposeNote(baseInterval, keyOffset);
            btn.innerText = `${newNote}${chordType}`;
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