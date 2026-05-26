class PartituraEditor {
    constructor(editIframe, viewIframe, musicTheory) {
        this.editIframe = editIframe;
        this.viewIframe = viewIframe;
        this.musicTheory = musicTheory;
        this.vf = Vex.Flow;

        this.basePitches = [
            "g#/3", "a/3", "a#/3", "b/3",
            "c/4", "c#/4", "d/4", "d#/4", "e/4", "f/4", "f#/4", "g/4", "g#/4", "a/4", "a#/4", "b/4",
            "c/5", "c#/5", "d/5", "d#/5", "e/5", "f/5", "f#/5", "g/5"
        ];

        this.currentData = [];
        this.noteXPositions = [];
        this.persistentSelectedIndex = 0;

        // Controle de Seleção e Área de Transferência
        this.selectionStart = 0;
        this.selectionEnd = 0;
        this.copiedNotesBuffer = null;

        this.highlightIndex = -1;
        this.lastUsedPitch = "b/4";

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
                <button class="tool-btn btn-add" id="btn-add" title="Adicionar Nota">+♪</button>
                <button class="tool-btn btn-rest" id="btn-rest" title="Adicionar Pausa">𝄽</button>
                <button class="tool-btn btn-tie" id="btn-tie" title="Ligar à próxima nota">‿</button>
                <button class="tool-btn btn-bar" id="btn-bar" title="Compasso">|</button>
                <button class="tool-btn btn-delete" id="btn-delete" title="Apagar Nota">
                   <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z"/><path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
                </button>
            </div>` : '';

        let bottomToolbarHtml = isEditable ? `
            <div class="bottom-toolbar">
                <button class="tool-btn btn-chord" id="btn-chord" title="Adicionar Cifra">C7</button>
                <button class="tool-btn btn-lyric" id="btn-lyric" title="Adicionar Letra">Abc</button>
            </div>` : '';

        doc.body.innerHTML = `${topToolbarHtml}<div id="score-container"><div id="vexflow-target"></div></div>${sideToolbarHtml}${bottomToolbarHtml}`;

        const style = doc.createElement('style');
        style.innerHTML = `
            body { 
                font-family: sans-serif; 
                margin: 0; 
                overflow-x: auto; 
                overflow-y: hidden; 
                display: flex; 
                align-items: flex-start; 
                padding-top: 60px; 
                min-height: 100vh; 
                background-color: transparent; 
            }
            #score-container { min-width: max-content; padding: 20px; padding-bottom: 80px; position: relative; }
            
            .top-toolbar { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1100; background: rgba(255,255,255,0.9); padding: 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .side-toolbar { position: fixed; right: 10px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px; z-index: 1000; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
            .bottom-toolbar { position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; z-index: 1100; background: rgba(255,255,255,0.9); padding: 8px 16px; border-radius: 8px; box-shadow: 0 -4px 12px rgba(0,0,0,0.15); }
            
            .tool-btn { width: 45px; height: 45px; background: #fff; border: 1px solid #333; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; transition: all 0.1s; outline: none; }
            .tool-btn:active { transform: scale(0.9); background: #f0f0f0; }
            
            .btn-nav { color: green; font-size: 20px; border-radius: 8px; }
            .btn-bar { color: #333; font-size: 24px; border-width: 1px; }
            .btn-add { color: #2e7d32; font-size: 24px; }
            .btn-rest { color: #333; font-size: 24px; }
            .btn-tie { color: #1976d2; font-size: 28px; font-weight: normal; padding-bottom: 10px;}
            .btn-delete { color: #c62828; }
            .btn-chord { color: #d32f2f; font-size: 16px; }
            .btn-lyric { color: #000; font-size: 16px; }
            
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
            doc.getElementById('btn-rest').onclick = () => this.addRest();
            doc.getElementById('btn-tie').onclick = () => this.toggleTie();
            doc.getElementById('btn-chord').onclick = () => this.showInlineInput('chord');
            doc.getElementById('btn-lyric').onclick = () => this.showInlineInput('lyric');
            doc.getElementById('btn-delete').onclick = () => this.deleteNoteAtCursor();

            doc.addEventListener('keydown', (e) => {
                if (e.target && e.target.tagName.toLowerCase() === 'input') return;

                // Atalhos Globais de Copiar/Colar (Ctrl+C / Ctrl+V) [Cmd+C / Cmd+V no Mac]
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                    e.preventDefault();
                    this.copySelectedRange();
                    return;
                }
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                    e.preventDefault();
                    this.pasteCopiedRange();
                    return;
                }

                switch (e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.alterarAltura(1);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.alterarAltura(-1);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        // Shift + Seta Esquerda seleciona no teclado
                        if (e.shiftKey) {
                            let novoIndex = this.persistentSelectedIndex - 1;
                            if (novoIndex >= 0) {
                                this.persistentSelectedIndex = novoIndex;
                                this.selectionEnd = novoIndex;
                                this.draw(this.editIframe, true);
                                this.centralizarNoCursor();
                            }
                        } else {
                            this.navegarCursor(-1);
                        }
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        // Shift + Seta Direita seleciona no teclado
                        if (e.shiftKey) {
                            let novoIndex = this.persistentSelectedIndex + 1;
                            if (novoIndex < this.currentData.length) {
                                this.persistentSelectedIndex = novoIndex;
                                this.selectionEnd = novoIndex;
                                this.draw(this.editIframe, true);
                                this.centralizarNoCursor();
                            }
                        } else {
                            this.navegarCursor(1);
                        }
                        break;
                    case 'Enter':
                        e.preventDefault();
                        this.addNewNote();
                        break;
                    case 'Backspace':
                    case 'Delete':
                        e.preventDefault();
                        this.deleteNoteAtCursor();
                        break;

                    default:
                        if ((e.key.length === 1 || e.key === 'Dead') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                            const isDead = e.key === 'Dead';
                            if (!isDead) e.preventDefault();
                            this.showInlineInput('lyric', isDead ? '' : e.key);
                        }
                        break;
                }
            });
        }
    }

    showInlineInput(type, initialKey = null) {
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

        if (initialKey !== null) {
            input.value = initialKey;
        } else {
            input.value = this.currentData[this.persistentSelectedIndex][type] || "";
        }

        doc.getElementById('score-container').appendChild(input);

        win.focus();
        setTimeout(() => {
            input.focus();
            if (!initialKey && input.value) input.select();
        }, 50);

        input.onclick = (e) => e.stopPropagation();

        input.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (this.persistentSelectedIndex < this.currentData.length - 1) {
                    input.dataset.advance = "true";
                }
                input.blur();
            } else if (e.key === 'Escape') {
                input.dataset.cancel = "true";
                input.blur();
            }
        };

        input.onblur = () => {
            if (input.dataset.handled === "true") return;

            const advance = input.dataset.advance === "true";

            if (input.dataset.cancel !== "true") {
                this.commitInput(input);
            } else {
                if (input.parentNode) input.parentNode.removeChild(input);
            }

            if (advance) {
                this.persistentSelectedIndex++;
                this.draw(this.editIframe, true);
                this.centralizarNoCursor();

                setTimeout(() => {
                    this.showInlineInput(type);
                }, 50);
            } else {
                this.draw(this.editIframe, true);
            }
        };
    }

    commitInput(specificInput = null) {
        const doc = this.editIframe.contentDocument;
        const input = specificInput || (doc ? doc.getElementById('inline-input') : null);

        if (input && input.parentNode) {
            const { type, index } = input.dataset;
            if (this.currentData[index]) {
                this.currentData[index][type] = input.value;
            }

            input.dataset.handled = "true";
            try {
                input.parentNode.removeChild(input);
            } catch (e) { }
        }
    }

    setChordToCurrentNote(chord) {
        if (this.persistentSelectedIndex >= 0 && this.persistentSelectedIndex < this.currentData.length) {
            this.commitInput();
            this.currentData[this.persistentSelectedIndex].chord = chord;
            this.draw(this.editIframe, true);
            this.showInlineInput('chord');
        }
    }

    navegarCursor(direcao) {
        this.commitInput();
        let novoIndex = this.persistentSelectedIndex + direcao;
        if (novoIndex >= 0 && novoIndex < this.currentData.length) {
            this.persistentSelectedIndex = novoIndex;
            // Move a seleção junto com a navegação normal
            this.selectionStart = novoIndex;
            this.selectionEnd = novoIndex;
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
            this.lastUsedPitch = this.basePitches[novoIndex];
            this.draw(this.editIframe, true);
        }
    }

    centralizarNoCursor() {
        this._centralizarEm(this.editIframe, this.noteXPositions[this.persistentSelectedIndex]);
    }

    centralizarDestaque() {
        this._centralizarEm(this.viewIframe, this.viewNoteXPositions?.[this.highlightIndex]);
    }

    _centralizarEm(iframe, noteX) {
        if (noteX == null) return;
        const win = iframe.contentWindow;
        if (!win) return;

        const offset = iframe.clientWidth * 0.35;
        win.scrollTo({
            left: noteX - offset,
            behavior: 'smooth'
        });
    }

    abrirEditor(dataArray = []) {
        if (!dataArray || dataArray.length === 0) {
            this.currentData = [{ notes: ["b/4"], chord: "", lyric: "", bar: false, rest: false, tie: false }];
        } else {
            this.currentData = dataArray.map(l => this.normalizeItem(l));
        }

        this.persistentSelectedIndex = this.currentData.length - 1;
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.onEditDrawn = () => this.bindClickNotasEditor();
        this.draw(this.editIframe, true);
    }

    bindClickNotasEditor() {
        const doc = this.editIframe.contentDocument;
        if (!doc) return;

        if (this._editClickHandler) {
            doc.removeEventListener('click', this._editClickHandler);
        }

        this._editClickHandler = (e) => {
            const notaEl = e.target.closest('.vf-stavenote');
            if (!notaEl) return;

            const notas = Array.from(doc.querySelectorAll('.vf-stavenote'));
            const index = notas.indexOf(notaEl);
            if (index === -1) return;

            // Shift + Clique: seleciona o intervalo do ponto inicial ao clicado
            if (e.shiftKey) {
                this.selectionEnd = index;
            } else {
                this.selectionStart = index;
                this.selectionEnd = index;
            }

            this.persistentSelectedIndex = index;
            this.draw(this.editIframe, true);
        };

        doc.addEventListener('click', this._editClickHandler);

        if (!doc.getElementById('nota-cursor-style')) {
            const style = doc.createElement('style');
            style.id = 'nota-cursor-style';
            style.innerHTML = '.vf-stavenote { cursor: pointer; }';
            doc.head.appendChild(style);
        }
    }

    copySelectedRange() {
        const start = this.selectionStart ?? this.persistentSelectedIndex ?? 0;
        const end = this.selectionEnd ?? this.persistentSelectedIndex ?? 0;
        const minSel = Math.min(start, end);
        const maxSel = Math.max(start, end);

        // Clona de forma profunda os objetos do intervalo selecionado
        this.copiedNotesBuffer = this.currentData.slice(minSel, maxSel + 1).map(item => ({
            notes: [...item.notes],
            chord: item.chord,
            lyric: item.lyric,
            bar: item.bar,
            rest: item.rest,
            tie: item.tie
        }));
    }

    pasteCopiedRange() {
        if (!this.copiedNotesBuffer || this.copiedNotesBuffer.length === 0) return;
        this.commitInput();

        // Clona o buffer para que múltiplas colagens não interfiram uma na outra
        const clonedPaste = this.copiedNotesBuffer.map(item => ({
            notes: [...item.notes],
            chord: item.chord,
            lyric: item.lyric,
            bar: item.bar,
            rest: item.rest,
            tie: item.tie
        }));

        const insertIndex = this.persistentSelectedIndex + 1;
        // Insere o trecho copiado imediatamente após o cursor
        this.currentData.splice(insertIndex, 0, ...clonedPaste);

        // Desloca a seleção visual para o trecho recém-colado
        this.selectionStart = insertIndex;
        this.selectionEnd = insertIndex + clonedPaste.length - 1;
        this.persistentSelectedIndex = this.selectionEnd;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    renderizarVisualizacao(dataArray = []) {
        this.currentData = dataArray.map(l => this.normalizeItem(l));
        this.draw(this.viewIframe, false);
        if (this.onViewDrawn) this.onViewDrawn();
    }

    obterDadosParaSalvar() {
        this.commitInput();
        return this.currentData.map(d => {
            let s = d.chord ? `[${d.chord}]` : "";
            s += d.notes.join(",");
            if (d.tie) s += '~';
            if (d.lyric) s += `@${d.lyric}`;
            if (d.rest) s = 'R|' + s;
            if (d.bar) s += `|`;
            return s;
        }).join('\n');
    }

    normalizeItem(item) {
        let str = String(item).trim();
        let chord = "", lyric = "", bar = false, rest = false, tie = false;

        if (str.startsWith('R|')) { rest = true; str = str.slice(2); }
        if (str.endsWith('|')) { bar = true; str = str.slice(0, -1); }

        if (str.includes('@')) {
            let parts = str.split('@');
            lyric = parts[1]; str = parts[0];
        }

        if (str.endsWith('~')) { tie = true; str = str.slice(0, -1); }

        if (str.startsWith('[')) {
            let closeIdx = str.indexOf(']');
            if (closeIdx !== -1) { chord = str.substring(1, closeIdx); str = str.substring(closeIdx + 1); }
        }

        let notes = str.split(',').map(n => n.trim());
        if (notes.length === 1 && notes[0] === "") notes = ["b/4"];

        return { notes, chord, lyric, bar, rest, tie };
    }

    draw(iframe, isEditable) {
        const doc = iframe.contentDocument;
        const target = doc.getElementById('vexflow-target');
        if (!target) return;
        target.innerHTML = "";

        const isDark = document.body.classList.contains('dark-mode');
        doc.getElementById('score-container').className = isDark ? 'dark-mode-svg' : '';

        const notaEspacamento = 80;
        const width = Math.max(iframe.clientWidth - 80, this.currentData.length * notaEspacamento);
        const renderer = new this.vf.Renderer(target, this.vf.Renderer.Backends.SVG);

        renderer.resize(width, 400);
        const context = renderer.getContext();

        const stave = new this.vf.Stave(10, 40, width - 20);
        stave.addClef("treble").setContext(context).draw();

        const staveNotesRef = [];
        const temCifraNaPartitura = this.currentData.some(d => d.chord && d.chord.trim() !== "");
        const lyricFontSize = (!isEditable && !temCifraNaPartitura) ? 15 : 12;

        const tickables = this.currentData.flatMap((data, index) => {
            const note = new this.vf.StaveNote({
                keys: data.rest ? ["b/4"] : data.notes,
                duration: data.rest ? "qr" : "q"
            });

            staveNotesRef.push({ noteObj: note, dataObj: data });

            if (!data.rest) {
                data.notes.forEach((keyName, i) => {
                    const match = keyName.match(/([a-g])([#b])\//i);
                    if (match) note.addModifier(new this.vf.Accidental(match[2]), i);
                });
            }
            if (note.getStem()) note.getStem().hide = true;

            if (data.chord) {
                note.addModifier(new this.vf.ChordSymbol().setFont('Arial', 12, 'bold').addText(data.chord), 0);
            }

            if (data.lyric) {
                note.addModifier(new this.vf.Annotation(data.lyric)
                    .setFont('Roboto', lyricFontSize, 'italic')
                    .setVerticalJustification(this.vf.Annotation.VerticalJustify.BOTTOM), 0);
            }

            // Renderiza Destaque Visual no Editor para intervalo de Seleção
            if (isEditable) {
                const start = this.selectionStart ?? this.persistentSelectedIndex ?? 0;
                const end = this.selectionEnd ?? this.persistentSelectedIndex ?? 0;
                const minSel = Math.min(start, end);
                const maxSel = Math.max(start, end);

                if (index >= minSel && index <= maxSel) {
                    if (index === this.persistentSelectedIndex) {
                        note.setStyle({ fillStyle: "green", strokeStyle: "green" });
                    } else {
                        note.setStyle({ fillStyle: "#17a2b8", strokeStyle: "#17a2b8" });
                    }
                }
            } else if (!isEditable && index === this.highlightIndex) {
                note.setStyle({ fillStyle: "#007bff", strokeStyle: "#007bff" });
            }
            return data.bar ? [note, new this.vf.BarNote()] : [note];
        });

        const tiesToDraw = [];
        for (let i = 0; i < staveNotesRef.length - 1; i++) {
            if (staveNotesRef[i].dataObj.tie) {
                tiesToDraw.push(new this.vf.StaveTie({
                    first_note: staveNotesRef[i].noteObj,
                    last_note: staveNotesRef[i + 1].noteObj,
                    first_indices: [0],
                    last_indices: [0]
                }));
            }
        }

        const voice = new this.vf.Voice({ num_beats: this.currentData.length, beat_value: 4 }).setStrict(false);
        voice.addTickables(tickables);
        new this.vf.Formatter().joinVoices([voice]).format([voice], width - 100);
        voice.draw(context, stave);

        tiesToDraw.forEach(t => t.setContext(context).draw());

        if (isEditable) {
            this.noteXPositions = tickables.filter(t => t instanceof this.vf.StaveNote).map(n => n.getAbsoluteX());
            if (this.onEditDrawn) this.onEditDrawn();
            setTimeout(() => this.centralizarNoCursor(), 50);
        } else {
            this.viewNoteXPositions = tickables.filter(t => t instanceof this.vf.StaveNote).map(n => n.getAbsoluteX());
            if (this.onViewDrawn) this.onViewDrawn();
            setTimeout(() => this.centralizarDestaque(), 50);
        }
    }

    transporVisualizacao(semitones) {
        if (semitones === 0) return;

        this.currentData = this.currentData.map(item => {
            let newItem = { ...item };

            if (!item.rest) {
                newItem.notes = item.notes.map(n => {
                    const idx = this.basePitches.indexOf(n);
                    if (idx === -1) return n;
                    const novoIdx = Math.max(0, Math.min(this.basePitches.length - 1, idx + semitones));
                    return this.basePitches[novoIdx];
                });
            }

            if (item.chord) {
                let chord = item.chord;
                const partes = chord.split('/');
                const principal = partes[0];

                const match = principal.match(/^([A-G][#b]?)(.*)/);
                if (match) {
                    const tonica = match[1];
                    const resto = match[2];

                    const tonicaTransposta = this.musicTheory.transposeAcorde(tonica, semitones, null);
                    chord = tonicaTransposta + resto;

                    if (partes[1]) {
                        const baixoMatch = partes[1].match(/^([A-G][#b]?)(.*)/);
                        if (baixoMatch) {
                            const baixoTransposto = this.musicTheory.transposeAcorde(baixoMatch[1], semitones, null);
                            chord += '/' + baixoTransposto + baixoMatch[2];
                        }
                    }
                }
                newItem.chord = chord;
            }

            return newItem;
        });

        this.draw(this.viewIframe, false);
        if (this.onViewDrawn) this.onViewDrawn();
    }

    addNewNote() {
        this.commitInput();
        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: [this.lastUsedPitch],
            chord: "",
            lyric: "",
            bar: false,
            rest: false,
            tie: false
        });
        this.persistentSelectedIndex++;
        
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    addRest() {
        this.commitInput();
        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: ["b/4"],
            chord: "",
            lyric: "",
            bar: false,
            rest: true,
            tie: false
        });
        this.persistentSelectedIndex++;
        
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    toggleTie() {
        if (this.persistentSelectedIndex === -1 || this.persistentSelectedIndex >= this.currentData.length - 1) return;
        this.currentData[this.persistentSelectedIndex].tie = !this.currentData[this.persistentSelectedIndex].tie;
        this.draw(this.editIframe, true);
    }

    deleteNoteAtCursor() {
        if (this.currentData.length <= 1) {
            this.currentData[0] = { notes: ["b/4"], chord: "", lyric: "", bar: false, rest: false, tie: false };
        } else {
            this.currentData.splice(this.persistentSelectedIndex, 1);
            if (this.persistentSelectedIndex >= this.currentData.length) {
                this.persistentSelectedIndex = this.currentData.length - 1;
            }
        }
        
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.draw(this.editIframe, true);
    }

    toggleBar() {
        this.currentData[this.persistentSelectedIndex].bar = !this.currentData[this.persistentSelectedIndex].bar;
        this.draw(this.editIframe, true);
    }
}