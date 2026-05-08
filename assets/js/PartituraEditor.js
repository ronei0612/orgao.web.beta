class PartituraEditor {
    constructor(editIframe, viewIframe) {
        this.editIframe = editIframe;
        this.viewIframe = viewIframe;
        this.vf = Vex.Flow;

        // Escala estendida para navegação via setas
        this.basePitches = [
            "c/4", "c#/4", "d/4", "d#/4", "e/4", "f/4", "f#/4", "g/4", "g#/4", "a/4", "a#/4", "b/4",
            "c/5", "c#/5", "d/5", "d#/5", "e/5", "f/5", "f#/5", "g/5", "g#/5", "a/5", "a#/5", "b/5"
        ];

        this.currentData = [];
        this.noteXPositions = [];
        this.persistentSelectedIndex = 0;

        this.prepararIframe(this.editIframe, true);
        this.prepararIframe(this.viewIframe, false);
    }

    prepararIframe(iframe, isEditable) {
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        // Toolbar Superior (Setas e Compasso)
        let topToolbarHtml = isEditable ? `
            <div class="top-toolbar">
                <button class="tool-btn btn-nav" id="btn-up" title="Subir Nota">▲</button>
                <button class="tool-btn btn-bar" id="btn-bar" title="Compasso">|</button>
                <button class="tool-btn btn-nav" id="btn-down" title="Baixar Nota">▼</button>
            </div>` : '';

        // Toolbar Lateral (Criação e Edição)
        let sideToolbarHtml = isEditable ? `
            <div class="side-toolbar">
                <button class="tool-btn btn-add" id="btn-add">+♪</button>
                <button class="tool-btn btn-chord" id="btn-chord">C7</button>
                <button class="tool-btn btn-lyric" id="btn-lyric">Abc</button>
                <button class="tool-btn btn-delete" id="btn-delete">
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z"/><path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
                </button>
            </div>` : '';

        doc.body.innerHTML = `
            ${topToolbarHtml}
            <div id="score-container"><div id="vexflow-target"></div></div>
            ${sideToolbarHtml}
        `;

        const style = doc.createElement('style');
        style.innerHTML = `
            body { font-family: sans-serif; margin: 0; overflow-x: auto; overflow-y: hidden; display: flex; align-items: center; min-height: 100vh; background-color: transparent; }
            #score-container { cursor: pointer; min-width: max-content; position: relative; padding: 20px; }
            
            .top-toolbar { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; z-index: 1100; background: rgba(255, 255, 255, 0.9); padding: 8px 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #ddd; }
            .side-toolbar { position: fixed; right: 10px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px; z-index: 1000; background: rgba(255, 255, 255, 0.9); padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
            
            .tool-btn { width: 45px; height: 45px; background: #fff; border: 1px solid #333; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; font-size: 18px; transition: all 0.2s; }
            .tool-btn:active { transform: scale(0.9); background: #f0f0f0; }
            
            .btn-nav { color: green; font-size: 22px; border-radius: 8px; }
            .btn-bar { color: #333; font-size: 24px; width: 45px; height: 45px; border-width: 1px; }
            .btn-add { color: #2e7d32; font-size: 24px; }
            .btn-chord { color: #1565C0; }
            .btn-lyric { color: #E65100; font-size: 16px; }
            .btn-delete { color: #c62828; }
            
            .inline-input { position: absolute; transform: translateX(-50%); width: 70px; text-align: center; font-weight: bold; border: 2px solid #2196F3; border-radius: 4px; z-index: 100; background: white; }
            .dark-mode-svg { filter: invert(1) hue-rotate(180deg); }
        `;
        doc.head.appendChild(style);

        if (isEditable) {
            // Eventos Top
            doc.getElementById('btn-up').onclick = () => this.alterarAltura(1);
            doc.getElementById('btn-down').onclick = () => this.alterarAltura(-1);
            doc.getElementById('btn-bar').onclick = () => this.toggleBar();

            // Eventos Side
            doc.getElementById('btn-add').onclick = () => this.addNewNote();
            doc.getElementById('btn-chord').onclick = () => this.showInlineInput('chord');
            doc.getElementById('btn-lyric').onclick = () => this.showInlineInput('lyric');
            doc.getElementById('btn-delete').onclick = () => this.deleteLastNote();

            this.setupClickSelection(iframe);
        }
    }

    // --- LOGICA DE NAVEGAÇÃO DE NOTAS ---

    alterarAltura(direcao) {
        if (this.persistentSelectedIndex === -1) return;

        const notaAtual = this.currentData[this.persistentSelectedIndex].notes[0];
        let index = this.basePitches.indexOf(notaAtual);

        // Se a nota não for encontrada exatamente (por causa de acidentes), tenta achar a base
        if (index === -1) {
            const base = notaAtual.replace(/[#b]/g, '');
            index = this.basePitches.indexOf(base);
        }

        let novoIndex = index + direcao;
        if (novoIndex >= 0 && novoIndex < this.basePitches.length) {
            this.currentData[this.persistentSelectedIndex].notes = [this.basePitches[novoIndex]];
            this.draw(this.editIframe, true);
        }
    }

    setupClickSelection(iframe) {
        const doc = iframe.contentDocument;
        const container = doc.getElementById('score-container');

        container.onclick = (e) => {
            if (e.target.id === 'inline-input') return;
            this.commitInput();
            const rect = container.getBoundingClientRect();
            const x = e.clientX + iframe.contentWindow.scrollX - rect.left;

            // Encontra a nota mais próxima do clique horizontal
            let found = this.noteXPositions.findIndex(pos => Math.abs(x - pos) < 35);
            if (found !== -1) {
                this.persistentSelectedIndex = found;
                this.draw(iframe, true);
            }
        };
    }

    // --- MÉTODOS DE CONTROLE (Chamados pelo App.js) ---

    abrirEditor(dataArray = []) {
        this.currentData = (dataArray && dataArray.length > 0)
            ? dataArray.map(l => this.normalizeItem(l))
            : [{ notes: ["b/4"], chord: "", lyric: "", bar: false }];

        this.persistentSelectedIndex = this.currentData.length - 1;
        this.draw(this.editIframe, true);
    }

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

    // --- LÓGICA VEXFLOW ---

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
        if (!iframe) return;
        const doc = iframe.contentDocument;
        const target = doc.getElementById('vexflow-target');
        const container = doc.getElementById('score-container');
        if (!target) return;

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
                note.setStyle({ fillStyle: "green", strokeStyle: "green" });
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
        this.commitInput();
        this.currentData.push({ notes: ["b/4"], chord: "", lyric: "", bar: false });
        this.persistentSelectedIndex = this.currentData.length - 1;
        this.draw(this.editIframe, true);
        this.editIframe.contentWindow.scrollTo({ left: 9999, behavior: 'smooth' });
    }

    deleteLastNote() {
        this.commitInput();
        if (this.currentData.length > 1) {
            this.currentData.pop();
            this.persistentSelectedIndex = this.currentData.length - 1;
            this.draw(this.editIframe, true);
        }
    }

    toggleBar() {
        if (this.persistentSelectedIndex !== -1) {
            this.currentData[this.persistentSelectedIndex].bar = !this.currentData[this.persistentSelectedIndex].bar;
            this.draw(this.editIframe, true);
        }
    }
}