class PartituraEditor {
    constructor(editIframe, viewIframe) {
        this.editIframe = editIframe;
        this.viewIframe = viewIframe;
        this.vf = Vex.Flow;

        // 1. EXTENSÃO ATUALIZADA: G3 até G6 (Cromático)
        this.basePitches = [
            "e/3", "f/3", "f#/3", "g/3", "g#/3", "a/3", "a#/3", "b/3",
            "c/4", "c#/4", "d/4", "d#/4", "e/4", "f/4", "f#/4", "g/4", "g#/4", "a/4", "a#/4", "b/4",
            "c/5", "c#/5", "d/5", "d#/5", "e/5", "f/5", "f#/5", "g/5", "g#/5", "a/5", "a#/5", "b/5",
            "c/6", "c#/6", "d/6", "d#/6"
        ];

        this.currentData = [];
        this.noteXPositions = [];
        this.persistentSelectedIndex = 0;
        this.highlightIndex = -1;

        this.prepararIframe(this.editIframe, true);
        this.prepararIframe(this.viewIframe, false);
    }

    prepararIframe(iframe, isEditable) {
        const doc = iframe.contentDocument || iframe.contentWindow.document;

        let topToolbarHtml = isEditable ? `
            <div class="top-toolbar">
                <button class="tool-btn btn-nav" id="btn-prev" title="Nota Anterior">◀</button>
                <button class="tool-btn btn-nav" id="btn-up" title="Subir Nota">▲</button>
                <button class="tool-btn btn-nav" id="btn-down" title="Baixar Nota">▼</button>
                <button class="tool-btn btn-nav" id="btn-next" title="Próxima Nota">▶</button>
            </div>` : '';

        let sideToolbarHtml = isEditable ? `
            <div class="side-toolbar">
                <button class="tool-btn btn-add" id="btn-add">+♪</button>
                <button class="tool-btn btn-bar" id="btn-bar" title="Compasso">|</button>
                <button class="tool-btn btn-chord" id="btn-chord">C7</button>
                <button class="tool-btn btn-lyric" id="btn-lyric">Abc</button>
                <button class="tool-btn btn-delete" id="btn-delete">
                   <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z"/><path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
                </button>
            </div>` : '';

        doc.body.innerHTML = `${topToolbarHtml}<div id="score-container"><div id="vexflow-target"></div></div>${sideToolbarHtml}`;

        const style = doc.createElement('style');
        style.innerHTML = `
            body { 
                font-family: sans-serif; 
                margin: 0; 
                overflow-x: auto; 
                overflow-y: hidden; 
                display: flex; 
                /* 2. PARTITURA NO TOPO */
                align-items: flex-start; 
                padding-top: 60px; 
                min-height: 100vh; 
                background-color: transparent; 
            }
            #score-container { min-width: max-content; padding: 20px; position: relative; }
            .top-toolbar { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1100; background: rgba(255,255,255,0.9); padding: 8px; border-radius: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .side-toolbar { position: fixed; right: 10px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px; z-index: 1000; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
            .tool-btn { width: 45px; height: 45px; background: #fff; border: 1px solid #333; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; transition: all 0.1s; outline: none; }
            .tool-btn:active { transform: scale(0.9); background: #f0f0f0; }
            .btn-nav { color: green; font-size: 20px; border-radius: 8px; }
            .btn-bar { color: #333; font-size: 24px; border-width: 1px; }
            .btn-add { color: #2e7d32; font-size: 24px; }
            .btn-delete { color: #c62828; }
            .inline-input { 
                position: absolute; 
                transform: translateX(-50%); 
                width: 80px; 
                text-align: center; 
                font-size: 16px;
                font-weight: bold; 
                border: 2px solid #2196F3; 
                border-radius: 4px; 
                z-index: 1200; 
                background: white; 
                color: black;
                padding: 5px;
                outline: none;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            .dark-mode-svg { filter: invert(1) hue-rotate(180deg); }
        `;
        doc.head.appendChild(style);

        if (isEditable) {
            doc.getElementById('btn-prev').onclick = () => this.navegarCursor(-1);
            doc.getElementById('btn-next').onclick = () => this.navegarCursor(1);
            doc.getElementById('btn-up').onclick = () => this.alterarAltura(1);
            doc.getElementById('btn-down').onclick = () => this.alterarAltura(-1);
            doc.getElementById('btn-bar').onclick = () => this.toggleBar();
            doc.getElementById('btn-add').onclick = () => this.addNewNote();
            doc.getElementById('btn-chord').onclick = () => this.showInlineInput('chord');
            doc.getElementById('btn-lyric').onclick = () => this.showInlineInput('lyric');
            doc.getElementById('btn-delete').onclick = () => this.deleteNoteAtCursor();
        }
    }

    // ... (seu construtor e prepararIframe permanecem iguais)

    showInlineInput(type) {
        this.commitInput();

        const doc = this.editIframe.contentDocument;
        const win = this.editIframe.contentWindow;
        const xPos = this.noteXPositions[this.persistentSelectedIndex];

        const input = doc.createElement('input');
        input.id = 'inline-input';
        input.className = 'inline-input';
        input.style.left = xPos + 'px';
        input.style.top = (type === 'chord' ? '40px' : '230px');
        input.dataset.type = type;
        input.dataset.index = this.persistentSelectedIndex;
        input.value = this.currentData[this.persistentSelectedIndex][type] || "";

        doc.getElementById('score-container').appendChild(input);

        win.focus();
        setTimeout(() => {
            input.focus();
            if (input.value) input.select();
        }, 50);

        input.onclick = (e) => e.stopPropagation();

        input.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                input.blur(); // Apenas forçamos o blur. O onblur cuidará do commit e do draw.
            }
            if (e.key === 'Escape') {
                input.dataset.cancel = "true"; // Marcamos que foi cancelado
                input.blur();
            }
        };

        input.onblur = () => {
            // Se não foi cancelado via ESC, salvamos
            if (input.dataset.cancel !== "true") {
                this.commitInput();
            } else {
                input.remove(); // Se foi ESC, apenas removemos sem salvar
            }
            this.draw(this.editIframe, true);
        };
    }

    commitInput() {
        const doc = this.editIframe.contentDocument;
        const input = doc.getElementById('inline-input');

        // Verificamos se o input existe E se ele ainda está anexado ao DOM (parentNode)
        if (input && input.parentNode) {
            const { type, index } = input.dataset;
            if (this.currentData[index]) {
                this.currentData[index][type] = input.value;
            }

            // Usamos uma verificação extra para evitar o erro do remove
            try {
                input.parentNode.removeChild(input);
            } catch (e) {
                // Se por algum motivo o nó já sumiu, ignoramos silenciosamente
                console.warn("Input já havia sido removido");
            }
        }
    }

    // ... (o restante dos métodos draw, addNewNote, etc, permanecem iguais)

    navegarCursor(direcao) {
        this.commitInput();
        let novoIndex = this.persistentSelectedIndex + direcao;
        if (novoIndex >= 0 && novoIndex < this.currentData.length) {
            this.persistentSelectedIndex = novoIndex;
            this.draw(this.editIframe, true);
            this.centralizarNoCursor();
        }
    }

    alterarAltura(direcao) {
        if (this.persistentSelectedIndex === -1) return;
        const notaAtual = this.currentData[this.persistentSelectedIndex].notes[0];
        let index = this.basePitches.indexOf(notaAtual);
        if (index === -1) index = this.basePitches.indexOf(notaAtual.replace(/[#b]/g, ''));

        let novoIndex = index + direcao;
        if (novoIndex >= 0 && novoIndex < this.basePitches.length) {
            this.currentData[this.persistentSelectedIndex].notes = [this.basePitches[novoIndex]];
            this.draw(this.editIframe, true);
        }
    }

    centralizarNoCursor() {
        const doc = this.editIframe.contentDocument;
        const target = doc.querySelector('svg .vf-stavenote:nth-child(' + (this.persistentSelectedIndex + 1) + ')');
        if (target) target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

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
            let s = d.chord ? `[${d.chord}]` : "";
            s += d.notes.join(",");
            if (d.lyric) s += `@${d.lyric}`;
            if (d.bar) s += `|`;
            return s;
        }).join('\n');
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

    draw(iframe, isEditable) {
        const doc = iframe.contentDocument;
        const target = doc.getElementById('vexflow-target');
        if (!target) return;
        target.innerHTML = "";

        const isDark = document.body.classList.contains('dark-mode');
        doc.getElementById('score-container').className = isDark ? 'dark-mode-svg' : '';

        const width = Math.max(iframe.clientWidth - 80, this.currentData.length * 100);
        const renderer = new this.vf.Renderer(target, this.vf.Renderer.Backends.SVG);

        // 3. AJUSTE DE ALTURA DO RENDERER
        renderer.resize(width, 400);
        const context = renderer.getContext();

        // 4. POSIÇÃO DA PAUTA (Stave) NO IFRAME
        // y: 20 para ficar bem no topo, mas deixar espaço para cifras
        const stave = new this.vf.Stave(10, 40, width - 20);
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
            // NOVO: Destaque de reprodução (Modo Visualização)
            else if (!isEditable && index === this.highlightIndex) {
                note.setStyle({ fillStyle: "#007bff", strokeStyle: "#007bff" });
            }
            return data.bar ? [note, new this.vf.BarNote()] : [note];
        });

        const voice = new this.vf.Voice({ num_beats: this.currentData.length, beat_value: 4 }).setStrict(false);
        voice.addTickables(tickables);
        new this.vf.Formatter().joinVoices([voice]).format([voice], width - 100);
        voice.draw(context, stave);

        if (isEditable) {
            this.noteXPositions = tickables.filter(t => t instanceof this.vf.StaveNote).map(n => n.getAbsoluteX());
        }
    }

    addNewNote() {
        this.commitInput();
        this.currentData.splice(this.persistentSelectedIndex + 1, 0, { notes: ["b/4"], chord: "", lyric: "", bar: false });
        this.persistentSelectedIndex++;
        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    deleteNoteAtCursor() {
        if (this.currentData.length > 1) {
            this.currentData.splice(this.persistentSelectedIndex, 1);
            if (this.persistentSelectedIndex >= this.currentData.length) this.persistentSelectedIndex = this.currentData.length - 1;
            this.draw(this.editIframe, true);
        }
    }

    toggleBar() {
        this.currentData[this.persistentSelectedIndex].bar = !this.currentData[this.persistentSelectedIndex].bar;
        this.draw(this.editIframe, true);
    }
}