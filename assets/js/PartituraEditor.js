class PartituraEditor {
    constructor(iframeElement = null) {
        this.iframe = iframeElement;

        const doc = this.iframe.contentDocument;
        doc.body.innerHTML = '<div id="score-container"><div id="vexflow-target"></div></div>';

        this.document = doc;
        this.initInternalLogic();

        const style = doc.createElement('style');

        doc.head.querySelectorAll('style').forEach(style => {
            style.remove();
        });

        style.innerHTML = `
            body {
                font-family: sans-serif;
                margin: 0;
                overflow-x: auto;
                overflow-y: hidden;
                display: flex;
                align-items: center;
                min-height: 100vh;
                background-color: transparent;
                touch-action: none;
            }

            #score-container {
                cursor: pointer;
                min-width: max-content;
                position: relative;
                padding: 20px;
            }

            .side-toolbar {
                position: fixed;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 1000;
                background: rgba(255, 255, 255, 0.8);
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }

            .tool-btn {
                width: 50px;
                height: 50px;
                background: #fff;
                border: 2px solid #333;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
                font-size: 18px;
            }

                .tool-btn:active {
                    transform: scale(0.9);
                    background: #eee;
                }

            .btn-add {
                color: #2e7d32;
                font-size: 24px;
            }

            .btn-chord {
                color: #1565C0;
            }

            .btn-lyric {
                color: #E65100;
                font-size: 16px;
            }

            .btn-bar {
                color: #333;
                font-size: 24px;
            }

            .btn-delete {
                color: #c62828;
            }

            .inline-input {
                position: absolute;
                transform: translateX(-50%);
                width: 70px;
                text-align: center;
                font-weight: bold;
                border: 2px solid #2196F3;
                border-radius: 4px;
                z-index: 100;
            }

            .dark-mode-svg {
                filter: invert(1) hue-rotate(180deg);
            }
        `;
        doc.head.appendChild(style);
    }

    // --- LÓGICA DO GERENCIADOR (USADA PELO APP.JS) ---

    resetAndFill(dataArray = []) {
        const win = this.iframe.contentWindow;
        const setup = () => {
            //if (win.editorInstance) {
            //win.editorInstance.setData(dataArray);
            this.setData(dataArray);
            //}
        };

        if (this.iframe.contentDocument.readyState === 'complete') {
            setup();
        } else {
            this.iframe.onload = setup;
        }
    }

    obterDados() {
        const win = this.iframe.contentWindow;
        return win.editorInstance ? win.editorInstance.getData() : "";
    }


    // --- LÓGICA DE DESENHO E EDIÇÃO (RODA DENTRO DO IFRAME) ---

    initInternalLogic() {
        this.vf = Vex.Flow;
        this.container = this.document.getElementById('score-container');
        this.target = this.document.getElementById('vexflow-target');

        this.basePitches = ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5", "e/5", "f/5", "g/5", "a/5"];
        this.notesData = [];
        this.noteXPositions = [];
        this.isDragging = false;
        this.persistentSelectedIndex = 0;

        this.setupEvents();

        // Expõe a instância para o App.js conseguir falar com ela
        window.editorInstance = this;
    }

    normalizeItem(item) {
        let str = String(item).trim();
        let chord = "", lyric = "", bar = false;
        if (str.startsWith('[')) {
            let closeIdx = str.indexOf(']');
            if (closeIdx !== -1) { chord = str.substring(1, closeIdx); str = str.substring(closeIdx + 1); }
        }
        if (str.endsWith('|')) { bar = true; str = str.slice(0, -1); }
        if (str.includes('@')) {
            let parts = str.split('@');
            lyric = parts[1]; str = parts[0];
        }
        let notes = str.split(',').map(n => n.trim());
        if (notes.length === 1 && notes[0] === "") notes = ["b/4"];
        return { notes, chord, lyric, bar };
    }

    draw() {
        this.commitInput();
        this.target.innerHTML = "";
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) this.container.classList.add('dark-mode-svg');
        else this.container.classList.remove('dark-mode-svg');

        const width = Math.max(window.innerWidth - 80, this.notesData.length * 110);
        const renderer = new this.vf.Renderer(this.target, this.vf.Renderer.Backends.SVG);
        renderer.resize(width, 300);
        const context = renderer.getContext();
        const stave = new this.vf.Stave(10, 80, width - 20);
        stave.addClef("treble").setContext(context).draw();

        const tickables = this.notesData.flatMap((data, index) => {
            const note = new this.vf.StaveNote({ keys: data.notes, duration: "q" });
            data.notes.forEach((keyName, i) => {
                const match = keyName.match(/([a-g])([#b])\//i);
                if (match) note.addModifier(new this.vf.Accidental(match[2]), i);
            });
            if (note.getStem()) note.getStem().hide = true;
            if (data.chord) note.addModifier(new this.vf.ChordSymbol().setFont('Arial', 12, 'bold').addText(data.chord), 0);
            if (data.lyric) {
                note.addModifier(new this.vf.Annotation(data.lyric).setFont('Serif', 12, 'italic').setVerticalJustification(this.vf.Annotation.VerticalJustify.BOTTOM), 0);
            }
            if (index === this.persistentSelectedIndex) {
                note.setStyle({ fillStyle: "red", strokeStyle: "red" });
            }
            return data.bar ? [note, new this.vf.BarNote()] : [note];
        });

        if (tickables.length > 0) {
            const voice = new this.vf.Voice({ num_beats: this.notesData.length, beat_value: 4 }).setStrict(false);
            voice.addTickables(tickables);
            new this.vf.Formatter().joinVoices([voice]).format([voice], width - 100);
            voice.draw(context, stave);
            this.noteXPositions = tickables.filter(t => t instanceof this.vf.StaveNote).map(n => n.getAbsoluteX());
        }
    }

    // Métodos de Manipulação
    setData(dataArray) {
        this.notesData = (dataArray && dataArray.length > 0)
            ? dataArray.map(l => this.normalizeItem(l))
            : [{ notes: ["b/4"], chord: "", lyric: "", bar: false }];
        this.persistentSelectedIndex = this.notesData.length - 1;
        this.draw();
    }

    getData() {
        this.commitInput();
        return this.notesData.map(d => {
            let s = "";
            if (d.chord) s += `[${d.chord}]`;
            s += d.notes.join(",");
            if (d.lyric) s += `@${d.lyric}`;
            if (d.bar) s += `|`;
            return s;
        }).join('\n');
    }

    handleAction(action) {
        switch (action) {
            case 'add': this.addNewNote(); break;
            case 'chord': this.showInlineInput('chord'); break;
            case 'lyric': this.showInlineInput('lyric'); break;
            case 'bar': this.toggleBar(); break;
            case 'delete': this.deleteLastNote(); break;
        }
    }

    commitInput() {
        const input = this.document.getElementById('inline-input');
        if (input) {
            const { type, index } = input.dataset;
            if (this.notesData[index]) {
                if (type === 'chord') this.notesData[index].chord = input.value;
                else this.notesData[index].lyric = input.value;
            }
            input.remove();
        }
    }

    showInlineInput(type) {
        this.commitInput();
        const xPos = this.noteXPositions[this.persistentSelectedIndex];
        const input = this.document.createElement('input');
        input.id = 'inline-input';
        input.className = 'inline-input';
        input.style.left = xPos + 'px';
        input.style.top = (type === 'chord' ? '40px' : '230px');
        input.dataset.type = type;
        input.dataset.index = this.persistentSelectedIndex;
        input.value = type === 'chord' ? (this.notesData[this.persistentSelectedIndex].chord || "") : (this.notesData[this.persistentSelectedIndex].lyric || "");
        this.container.appendChild(input);
        input.focus();
        input.onkeydown = (e) => e.key === 'Enter' && this.draw();
        input.onblur = () => this.draw();
    }

    addNewNote() {
        this.notesData.push({ notes: ["b/4"], chord: "", lyric: "", bar: false });
        this.persistentSelectedIndex = this.notesData.length - 1;
        this.draw();
    }

    deleteLastNote() {
        if (this.notesData.length > 1) {
            this.notesData.pop();
            this.persistentSelectedIndex = this.notesData.length - 1;
            this.draw();
        }
    }

    toggleBar() {
        this.notesData[this.persistentSelectedIndex].bar = !this.notesData[this.persistentSelectedIndex].bar;
        this.draw();
    }

    setupEvents() {
        const handleStart = (e) => {
            if (e.target.id === 'inline-input') return;
            this.commitInput();
            const rect = this.container.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) + window.scrollX - rect.left;
            let found = this.noteXPositions.findIndex(pos => Math.abs(x - pos) < 25);
            if (found !== -1) {
                this.persistentSelectedIndex = found;
                this.isDragging = true;
                this.draw();
            }
        };

        const handleMove = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            const stepHeight = 5;
            const diff = Math.round((135 - y) / stepHeight);
            const newPitch = this.basePitches[Math.max(0, Math.min(6 + diff, this.basePitches.length - 1))];
            if (this.notesData[this.persistentSelectedIndex].notes[0] !== newPitch) {
                this.notesData[this.persistentSelectedIndex].notes = [newPitch];
                this.draw();
            }
        };

        this.container.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', () => this.isDragging = false);
        this.container.addEventListener('touchstart', handleStart, { passive: false });
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', () => this.isDragging = false);
    }
}