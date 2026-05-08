class PartituraEditor {
    constructor(editIframe, viewIframe) {
        this.editIframe = editIframe;
        this.viewIframe = viewIframe;
        this.vf = Vex.Flow;

        this.basePitches = ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5", "e/5", "f/5", "g/5", "a/5"];
        this.notesData = [];
        this.noteXPositions = [];
        this.isDragging = false;
        this.persistentSelectedIndex = 0;

        // Prepara os iframes assim que o app inicia
        this.prepararIframe(this.editIframe, true);
        this.prepararIframe(this.viewIframe, false);
    }

    /**
     * Injeta HTML e CSS básico dentro de um iframe vazio
     */
    prepararIframe(iframe, isEditable) {
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        let toolbarHtml = isEditable ? `
            <div id="toolbar-container">
                <div class="side-toolbar">
                    <button class="tool-btn btn-add" id="btn-add">+♪</button>
                    <button class="tool-btn btn-chord" id="btn-chord">C7</button>
                    <button class="tool-btn btn-lyric" id="btn-lyric">Abc</button>
                    <button class="tool-btn btn-bar" id="btn-bar">|</button>
                    <button class="tool-btn btn-delete" id="btn-delete">
                        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z"/><path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
                    </button>
                </div>
            </div>` : '';

        doc.body.innerHTML = `
            <div id="score-container"><div id="vexflow-target"></div></div>
            ${toolbarHtml}
        `;

        const style = doc.createElement('style');
        style.innerHTML = `
            body { font-family: sans-serif; margin: 0; overflow-x: auto; overflow-y: hidden; display: flex; align-items: center; min-height: 100vh; background-color: transparent; touch-action: none; }
            #score-container { cursor: pointer; min-width: max-content; position: relative; padding: 20px; }
            .side-toolbar { position: fixed; right: 10px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px; z-index: 1000; background: rgba(255, 255, 255, 0.8); padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
            .tool-btn { width: 50px; height: 50px; background: #fff; border: 2px solid #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; font-size: 18px; }
            .btn-add { color: #2e7d32; font-size: 24px; }
            .btn-chord { color: #1565C0; }
            .btn-lyric { color: #E65100; font-size: 16px; }
            .btn-bar { color: #333; font-size: 24px; }
            .btn-delete { color: #c62828; }
            .inline-input { position: absolute; transform: translateX(-50%); width: 70px; text-align: center; font-weight: bold; border: 2px solid #2196F3; border-radius: 4px; z-index: 100; background: white; }
            .dark-mode-svg { filter: invert(1) hue-rotate(180deg); }
        `;
        doc.head.appendChild(style);

        if (isEditable) {
            doc.getElementById('btn-add').onclick = () => this.addNewNote();
            doc.getElementById('btn-chord').onclick = () => this.showInlineInput('chord');
            doc.getElementById('btn-lyric').onclick = () => this.showInlineInput('lyric');
            doc.getElementById('btn-bar').onclick = () => this.toggleBar();
            doc.getElementById('btn-delete').onclick = () => this.deleteLastNote();
            this.setupEvents(iframe);
        }
    }

    // --- MÉTODOS DE CONTROLE ---

    // Chamado pelo App.js no handleEditSaveClick e handleAddClick
    abrirEditor(dataArray = []) {
        this.currentData = (dataArray && dataArray.length > 0)
            ? dataArray.map(l => this.normalizeItem(l))
            : [{ notes: ["b/4"], chord: "", lyric: "", bar: false }];

        this.persistentSelectedIndex = this.currentData.length - 1;
        this.draw(this.editIframe, true);
    }

    // Chamado pelo App.js no showLetraCifra
    renderizarVisualizacao(dataArray = []) {
        this.currentData = dataArray.map(l => this.normalizeItem(l));
        this.draw(this.viewIframe, false);
    }

    obterDadosParaSalvar() {
        this.commitInput();
        return this.currentData.map(d => {
            let s = "";
            if (d.chord) s += `[${d.chord}]`;
            s += d.notes.join(",");
            if (d.lyric) s += `@${d.lyric}`;
            if (d.bar) s += `|`;
            return s;
        }).join('\n');
    }

    // --- LÓGICA CORE ---

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

    draw(iframe, isEditable) {
        if (isEditable) this.commitInput();

        const doc = iframe.contentDocument;
        const target = doc.getElementById('vexflow-target');
        const container = doc.getElementById('score-container');

        target.innerHTML = "";

        const isDark = document.body.classList.contains('dark-mode');
        if (isDark) container.classList.add('dark-mode-svg');
        else container.classList.remove('dark-mode-svg');

        const width = Math.max(iframe.clientWidth - 80, this.currentData.length * 110);
        const renderer = new this.vf.Renderer(target, this.vf.Renderer.Backends.SVG);
        renderer.resize(width, 300);
        const context = renderer.getContext();
        const stave = new this.vf.Stave(10, 80, width - 20);
        stave.addClef("treble").setContext(context).draw();

        const tickables = this.currentData.flatMap((data, index) => {
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
            if (isEditable && index === this.persistentSelectedIndex) {
                note.setStyle({ fillStyle: "red", strokeStyle: "red" });
            }
            return data.bar ? [note, new this.vf.BarNote()] : [note];
        });

        if (tickables.length > 0) {
            const voice = new this.vf.Voice({ num_beats: this.currentData.length, beat_value: 4 }).setStrict(false);
            voice.addTickables(tickables);
            new this.vf.Formatter().joinVoices([voice]).format([voice], width - 100);
            voice.draw(context, stave);

            if (isEditable) {
                this.noteXPositions = tickables.filter(t => t instanceof this.vf.StaveNote).map(n => n.getAbsoluteX());
            }
        }
    }

    // --- MÉTODOS DE EDIÇÃO ---

    commitInput() {
        const doc = this.editIframe.contentDocument;
        const input = doc.getElementById('inline-input');
        if (input) {
            const { type, index } = input.dataset;
            if (this.currentData[index]) {
                if (type === 'chord') this.currentData[index].chord = input.value;
                else this.currentData[index].lyric = input.value;
            }
            input.remove();
        }
    }

    showInlineInput(type) {
        this.commitInput();
        const doc = this.editIframe.contentDocument;
        const xPos = this.noteXPositions[this.persistentSelectedIndex];
        const input = doc.createElement('input');
        input.id = 'inline-input';
        input.className = 'inline-input';
        input.style.left = xPos + 'px';
        input.style.top = (type === 'chord' ? '40px' : '230px');
        input.dataset.type = type;
        input.dataset.index = this.persistentSelectedIndex;
        input.value = type === 'chord' ? (this.currentData[this.persistentSelectedIndex].chord || "") : (this.currentData[this.persistentSelectedIndex].lyric || "");
        doc.getElementById('score-container').appendChild(input);
        input.focus();
        input.onkeydown = (e) => e.key === 'Enter' && this.draw(this.editIframe, true);
        input.onblur = () => this.draw(this.editIframe, true);
    }

    addNewNote() {
        this.currentData.push({ notes: ["b/4"], chord: "", lyric: "", bar: false });
        this.persistentSelectedIndex = this.currentData.length - 1;
        this.draw(this.editIframe, true);
    }

    deleteLastNote() {
        if (this.currentData.length > 1) {
            this.currentData.pop();
            this.persistentSelectedIndex = this.currentData.length - 1;
            this.draw(this.editIframe, true);
        }
    }

    toggleBar() {
        this.currentData[this.persistentSelectedIndex].bar = !this.currentData[this.persistentSelectedIndex].bar;
        this.draw(this.editIframe, true);
    }

    setupEvents(iframe) {
        const doc = iframe.contentDocument;
        const container = doc.getElementById('score-container');

        const handleStart = (e) => {
            if (e.target.id === 'inline-input') return;
            this.commitInput();
            const rect = container.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const x = clientX + iframe.contentWindow.scrollX - rect.left;

            let found = this.noteXPositions.findIndex(pos => Math.abs(x - pos) < 25);
            if (found !== -1) {
                this.persistentSelectedIndex = found;
                this.isDragging = true;
                this.draw(iframe, true);
            }
        };

        const handleMove = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const y = clientY - rect.top;

            const stepHeight = 5;
            const diff = Math.round((135 - y) / stepHeight);
            const newPitch = this.basePitches[Math.max(0, Math.min(6 + diff, this.basePitches.length - 1))];

            if (this.currentData[this.persistentSelectedIndex].notes[0] !== newPitch) {
                this.currentData[this.persistentSelectedIndex].notes = [newPitch];
                this.draw(iframe, true);
            }
        };

        container.addEventListener('mousedown', handleStart);
        iframe.contentWindow.addEventListener('mousemove', handleMove);
        iframe.contentWindow.addEventListener('mouseup', () => this.isDragging = false);
        container.addEventListener('touchstart', handleStart, { passive: false });
        iframe.contentWindow.addEventListener('touchmove', handleMove, { passive: false });
        iframe.contentWindow.addEventListener('touchend', () => this.isDragging = false);
    }
}