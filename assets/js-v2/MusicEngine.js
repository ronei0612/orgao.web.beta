class MusicTheory {
    constructor() {
        this.notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
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

    transposeNote(baseInterval, offset) {
        return this.getNoteByIndex(baseInterval + offset);
    }

    getPianoPattern() {
        return this.pianoPattern.map(key => ({ note: this.notes[key.index], type: key.type }));
    }
}

class ChordManager {
    constructor(toolbarController, musicTheory) {
        this.toolbar = toolbarController; // Usamos o Toolbar agora para dar play
        this.theory = musicTheory;

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
                // 1. Descobre em qual tela estamos e salva no sessionStorage
                const currentContext = sessionStorage.getItem('app_context') || 'ACORDES';
                sessionStorage.setItem(`key_${currentContext}`, val);

                // 2. Transpõe as bolinhas
                this.transposeChords(parseInt(val, 10));
            });
        }

        this.btnKeyDown?.addEventListener('click', () => this.changeKeyStep(-1));
        this.btnKeyUp?.addEventListener('click', () => this.changeKeyStep(1));
    }

    populateKeySelect() {
        if (!this.keySelect) return;
        this.keySelect.innerHTML = '';

        this.theory.notes.forEach((note, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = note;
            this.keySelect.appendChild(option);
        });
        this.keySelect.value = "0";
    }

    handleChordClick(btn) {
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
        const currentValue = parseInt(this.keySelect.value, 10);
        const newOffset = (currentValue + step + 12) % 12;
        this.keySelect.value = newOffset;
        this.transposeChords(newOffset);
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

        const octaves = [3, 4, 5];
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
        }
    }

    moveAction(pageX) {
        if (!this.isDown) return;
        const walk = (pageX - this.container.offsetLeft - this.startX);
        if (Math.abs(walk) > 5) {
            this.container.scrollLeft = this.scrollLeft - walk;
            if (this.activeKey) this.activeKey.classList.remove('pressed');
        }
    }

    upAction() {
        this.isDown = false;
        if (this.activeKey) {
            this.activeKey.classList.remove('pressed');
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