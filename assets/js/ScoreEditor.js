class ScoreEditor {
    constructor(editIframe, viewIframe, musicTheory) {
        this.editIframe = editIframe;
        this.viewIframe = viewIframe;
        this.musicTheory = musicTheory;
        this.vf = Vex.Flow;

        this.basePitches = [
            "f/3", "f#/3", "g/3", "g#/3", "a/3", "a#/3", "b/3",
            "c/4", "c#/4", "d/4", "d#/4", "e/4", "f/4", "f#/4", "g/4", "g#/4", "a/4", "a#/4", "b/4",
            "c/5", "c#/5", "d/5", "d#/5", "e/5", "f/5", "f#/5", "g/5", "g#/5", "a/5", "a#/5", "b/5",
            "c/6", "c#/6", "d/6", "d#/6", "e/6"
        ];

        this.currentData = [];
        this.noteXPositions = [];
        this.noteYPositions = [];
        this.persistentSelectedIndex = 0;
        this.selectionStart = 0;
        this.selectionEnd = 0;
        this.copiedNotesBuffer = null;

        this.highlightIndex = -1;
        this.lastUsedPitch = "b/4";

        const tecladoMapeamento = {
            'z': 'a#/3', 'x': 'b/3',
            'c': 'c/4', 'v': 'c#/4', 'b': 'd/4', 'n': 'd#/4', 'm': 'e/4',
            'a': 'f/4', 's': 'f#/4', 'd': 'g/4', 'f': 'g#/4', 'g': 'a/4', 'h': 'a#/4', 'j': 'b/4',
            'k': 'c/5', 'l': 'c#/5',
            'q': 'd/5', 'w': 'd#/5', 'e': 'e/5', 'r': 'f/5', 't': 'f#/5', 'y': 'g/5', 'u': 'g#/5', 'i': 'a/5', 'o': 'a#/5', 'p': 'b/5'
        };

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
        <button class="tool-btn btn-bar" style="display: none;" id="btn-bar" title="Compasso">|</button>
        <button class="tool-btn btn-delete" id="btn-delete" title="Apagar Nota">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z"/><path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
        </button>
    </div>` : '';

        let bottomToolbarHtml = isEditable ? `
    <div class="bottom-toolbar">
        <button class="tool-btn btn-octave" id="btn-octave-up" title="Subir Oitava (Toda Partitura)">↑8ª</button>
        <button class="tool-btn btn-octave" id="btn-octave-down" title="Descer Oitava (Toda Partitura)">↓8ª</button>
        <div style="width: 2px; background: #ccc; margin: 0 5px;"></div>
        <button class="tool-btn btn-linebreak" id="btn-linebreak" title="Quebrar Linha Após a Nota Atual">↲</button>
    </div>` : '';

        doc.body.innerHTML = `${topToolbarHtml}
    <div id="score-container">
        <div id="vexflow-target"></div>
        ${isEditable ? `
        <div id="floating-inputs-container" style="display:none; position:absolute; top:0; left:0; pointer-events:none; z-index:1200;">
            <input type="text" id="floating-chord" class="floating-input chord-input" placeholder="Cifra" autocomplete="off" />
            <input type="text" id="floating-lyric" class="floating-input lyric-input" placeholder="Letra" autocomplete="off" />
        </div>` : ''}
    </div>
    ${sideToolbarHtml}${bottomToolbarHtml}`;

        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        // Caminho relativo ao index.html
        link.href = './assets/css/partitura-iframe.css';
        doc.head.appendChild(link);

        if (isEditable) {
            doc.getElementById('btn-prev').onclick = () => this.navegarCursor(-1);
            doc.getElementById('btn-next').onclick = () => this.navegarCursor(1);
            doc.getElementById('btn-up').onclick = () => this.alterarAltura(1);
            doc.getElementById('btn-down').onclick = () => this.alterarAltura(-1);
            doc.getElementById('btn-bar').onclick = () => this.toggleBar();
            doc.getElementById('btn-add').onclick = () => this.addNewNote();
            doc.getElementById('btn-rest').onclick = () => this.addRest();
            doc.getElementById('btn-tie').onclick = () => this.toggleTie();
            doc.getElementById('btn-delete').onclick = () => this.deleteNoteAtCursor();
            doc.getElementById('btn-linebreak').onclick = () => this.toggleLineBreak();
            doc.getElementById('btn-octave-up').onclick = () => this.shiftOctaveAll(1);
            doc.getElementById('btn-octave-down').onclick = () => this.shiftOctaveAll(-1);

            const chordInput = doc.getElementById('floating-chord');
            const lyricInput = doc.getElementById('floating-lyric');

            const handleFloatingInput = (e, type) => {
                if (this.persistentSelectedIndex >= 0) {
                    this.currentData[this.persistentSelectedIndex][type] = e.target.value;
                }
            };

            const handleFloatingKeydown = (e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    this.navegarCursor(1);
                    setTimeout(() => {
                        const nextInput = doc.getElementById(e.target.id);
                        if (nextInput) { nextInput.focus(); nextInput.select(); }
                    }, 50);
                } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
                    e.preventDefault();
                    this.navegarCursor(1);
                    setTimeout(() => {
                        const nextInput = doc.getElementById(e.target.id);
                        if (nextInput) { nextInput.focus(); nextInput.select(); }
                    }, 50);
                } else if (e.key === 'ArrowLeft' && e.target.selectionEnd === 0) {
                    e.preventDefault();
                    this.navegarCursor(-1);
                    setTimeout(() => {
                        const prevInput = doc.getElementById(e.target.id);
                        if (prevInput) { prevInput.focus(); prevInput.select(); }
                    }, 50);
                } else if (e.key === 'Escape') {
                    e.target.blur();
                    doc.body.focus();
                }
            };

            if (chordInput && lyricInput) {
                chordInput.addEventListener('input', (e) => handleFloatingInput(e, 'chord'));
                chordInput.addEventListener('keydown', handleFloatingKeydown);
                lyricInput.addEventListener('input', (e) => handleFloatingInput(e, 'lyric'));
                lyricInput.addEventListener('keydown', handleFloatingKeydown);
            }

            doc.addEventListener('paste', (e) => {
                if (e.target && e.target.tagName.toLowerCase() === 'input') return;

                e.preventDefault();
                const pasteText = (e.clipboardData || iframe.contentWindow.clipboardData).getData('text');

                if (!pasteText) return;

                if (pasteText === "VEXFLOW_INTERNAL_COPY") {
                    this.pasteCopiedRange();
                } else {
                    this.parseABC(pasteText);
                }
            });

            doc.addEventListener('keydown', (e) => {
                if (e.target && e.target.tagName.toLowerCase() === 'input') return;

                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                    e.preventDefault();
                    this.copySelectedRange();
                    return;
                }

                const keyLower = e.key.toLowerCase();

                if (tecladoMapeamento[keyLower]) {
                    e.preventDefault();
                    if (this.persistentSelectedIndex >= 0) {
                        const newPitch = this.getEnarmonicPitch(tecladoMapeamento[keyLower]);
                        this.currentData[this.persistentSelectedIndex].notes = [newPitch];
                        this.currentData[this.persistentSelectedIndex].rest = false;
                        this.lastUsedPitch = newPitch;

                        this.draw(this.editIframe, true);
                        this.centralizarNoCursor();
                    }
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
                            if (lyricInput) {
                                lyricInput.focus();
                                if (!isDead) lyricInput.value = e.key;
                                else lyricInput.value = '';
                                this.currentData[this.persistentSelectedIndex].lyric = lyricInput.value;
                            }
                        }
                        break;
                }
            });
        }
    }

    parseABC(abcText) {
        const newData = ABCParser.parse(abcText);
        if (newData && newData.length > 0) {
            this.currentData = newData;
            this.persistentSelectedIndex = 0;
            this.selectionStart = 0;
            this.selectionEnd = 0;
            this.draw(this.editIframe, true);
        }
    }

    updateFloatingInputs() {
        const doc = this.editIframe.contentDocument;
        if (!doc) return;

        const container = doc.getElementById('floating-inputs-container');
        const chordInput = doc.getElementById('floating-chord');
        const lyricInput = doc.getElementById('floating-lyric');
        const scoreContainer = doc.getElementById('score-container');

        if (!container || !chordInput || !lyricInput || !scoreContainer) return;

        if (this.persistentSelectedIndex >= 0 && this.persistentSelectedIndex < this.currentData.length) {

            const notasRenderizadas = doc.querySelectorAll('.vf-stavenote');
            const notaAtualEl = notasRenderizadas[this.persistentSelectedIndex];

            if (notaAtualEl) {
                const rectNota = notaAtualEl.getBoundingClientRect();
                const rectContainer = scoreContainer.getBoundingClientRect();

                const xPos = (rectNota.left - rectContainer.left) + (rectNota.width / 2);
                const yBase = (rectNota.top - rectContainer.top);

                container.style.display = 'block';

                chordInput.style.left = xPos + 'px';
                chordInput.style.top = (yBase - 45) + 'px';

                lyricInput.style.left = xPos + 'px';
                lyricInput.style.top = (yBase + 110) + 'px';

                const currentNote = this.currentData[this.persistentSelectedIndex];

                if (doc.activeElement !== chordInput) chordInput.value = currentNote.chord || '';
                if (doc.activeElement !== lyricInput) lyricInput.value = currentNote.lyric || '';
            } else {
                container.style.display = 'none';
            }
        } else {
            container.style.display = 'none';
        }
    }

    shiftOctaveAll(direction) {
        let changed = false;

        const valoresNotas = { 'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6, 'gb': 6, 'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11 };
        const arrayNotasSustenidas = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

        this.currentData.forEach(item => {
            if (!item.rest) {
                item.notes = item.notes.map(note => {
                    const partes = note.split('/');
                    if (partes.length === 2) {
                        const notaLimpa = partes[0].toLowerCase();
                        let octave = parseInt(partes[1], 10);
                        octave += direction;

                        let valorAbsoluto = (octave * 12) + (valoresNotas[notaLimpa] ?? 0);

                        // LIMITES DO BASE PITCHES (F3 = 41, E6 = 76)
                        let clampValor = Math.max(41, Math.min(76, valorAbsoluto));

                        if (clampValor !== (parseInt(partes[1], 10) * 12 + (valoresNotas[notaLimpa] ?? 0))) {
                            changed = true;
                        }

                        const novaOitava = Math.floor(clampValor / 12);
                        const indiceNota = clampValor % 12;

                        const pitchBase = arrayNotasSustenidas[indiceNota] + '/' + novaOitava;
                        return this.getEnarmonicPitch(pitchBase);
                    }
                    return note;
                });
            }
        });

        if (changed) {
            this.draw(this.editIframe, true);
            this.centralizarNoCursor();
        }
    }

    getEnarmonicPitch(pitchStr) {
        const currentKey = this.getCurrentKey();

        let prefereBemol = false;
        if (currentKey.endsWith('b') || currentKey.endsWith('bm')) {
            prefereBemol = true;
        } else if (['F', 'Dm', 'Gm', 'Cm', 'Fm'].includes(currentKey)) {
            prefereBemol = true;
        } else if (this.musicTheory.tonsPreferemBemol.has(currentKey) && currentKey !== 'C' && currentKey !== 'Am') {
            prefereBemol = true;
        }

        if (!prefereBemol) return pitchStr;

        const partes = pitchStr.split('/');
        if (partes.length !== 2) return pitchStr;

        const nota = partes[0].toLowerCase();
        const oitava = partes[1];

        const mapSustenidoParaBemol = {
            'c#': 'db',
            'd#': 'eb',
            'f#': 'gb',
            'g#': 'ab',
            'a#': 'bb'
        };

        if (mapSustenidoParaBemol[nota]) {
            return mapSustenidoParaBemol[nota] + '/' + oitava;
        }

        return pitchStr;
    }

    convertAccidentalsToKey() {
        let changed = false;
        this.currentData.forEach(item => {
            if (!item.rest) {
                const newNotes = item.notes.map(n => {
                    const partes = n.split('/');
                    if (partes.length !== 2) return n;
                    const mapBemolParaSustenido = { 'db': 'c#', 'eb': 'd#', 'gb': 'f#', 'ab': 'g#', 'bb': 'a#' };
                    const notaBase = partes[0].toLowerCase();

                    let sustenido = n;
                    if (mapBemolParaSustenido[notaBase]) {
                        sustenido = mapBemolParaSustenido[notaBase] + '/' + partes[1];
                    }

                    const enarmonico = this.getEnarmonicPitch(sustenido);
                    if (enarmonico !== n) changed = true;
                    return enarmonico;
                });
                item.notes = newNotes;
            }
        });
        return changed;
    }

    setChordToCurrentNote(chord) {
        if (this.persistentSelectedIndex >= 0 && this.persistentSelectedIndex < this.currentData.length) {
            this.currentData[this.persistentSelectedIndex].chord = chord;
            this.draw(this.editIframe, true);

            const doc = this.editIframe.contentDocument;
            const chordInput = doc?.getElementById('floating-chord');
            if (chordInput) {
                chordInput.focus();
                chordInput.select();
            }
        }
    }

    navegarCursor(direcao) {
        let novoIndex = this.persistentSelectedIndex + direcao;
        if (novoIndex >= 0 && novoIndex < this.currentData.length) {
            this.persistentSelectedIndex = novoIndex;
            this.selectionStart = novoIndex;
            this.selectionEnd = novoIndex;
            this.draw(this.editIframe, true);
            this.centralizarNoCursor();
        }
    }

    alterarAltura(direcao) {
        if (this.persistentSelectedIndex === -1) return;
        const notaAtual = this.currentData[this.persistentSelectedIndex].notes[0];

        const partes = notaAtual.split('/');
        if (partes.length !== 2) return;

        const notaLimpa = partes[0].toLowerCase();
        const oitava = parseInt(partes[1], 10);

        const valoresNotas = { 'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6, 'gb': 6, 'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11 };

        let valorAbsoluto = (oitava * 12) + (valoresNotas[notaLimpa] ?? 0);
        valorAbsoluto += direcao;

        // LIMITES DO BASE PITCHES (F3 = 41, E6 = 76)
        valorAbsoluto = Math.max(41, Math.min(76, valorAbsoluto));

        const novaOitava = Math.floor(valorAbsoluto / 12);
        const indiceNota = valorAbsoluto % 12;

        const arrayNotasSustenidas = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

        const pitchBase = arrayNotasSustenidas[indiceNota] + '/' + novaOitava;
        const pitchFinal = this.getEnarmonicPitch(pitchBase);

        this.currentData[this.persistentSelectedIndex].notes = [pitchFinal];
        this.lastUsedPitch = pitchFinal;
        this.draw(this.editIframe, true);
    }

    centralizarNoCursor() {
        this._centralizarEm(
            this.editIframe,
            this.noteXPositions[this.persistentSelectedIndex],
            this.noteYPositions[this.persistentSelectedIndex]
        );
    }

    centralizarDestaque() {
        this._centralizarEm(
            this.viewIframe,
            this.viewNoteXPositions?.[this.highlightIndex],
            this.viewNoteYPositions?.[this.highlightIndex]
        );
    }

    _centralizarEm(iframe, noteX, noteY) {
        if (noteX == null || noteY == null) return;
        const win = iframe.contentWindow;
        if (!win) return;

        const offsetX = iframe.clientWidth * 0.35;
        const offsetY = iframe.clientHeight * 0.35;
        win.scrollTo({
            left: Math.max(0, noteX - offsetX),
            top: Math.max(0, noteY - offsetY),
            behavior: 'smooth'
        });
    }

    abrirEditor(dataArray = []) {
        if (!dataArray || dataArray.length === 0) {
            this.currentData = [{ notes: ["b/4"], chord: "", lyric: "", bar: false, rest: false, tie: false, lineBreak: false }];
            this.persistentSelectedIndex = 0;
        } else {
            this.currentData = dataArray.map(l => this.normalizeItem(l));

            // CORREÇÃO: Focar na nota que eu estava tocando/visualizando no modo view
            if (this.highlightIndex >= 0 && this.highlightIndex < this.currentData.length) {
                this.persistentSelectedIndex = this.highlightIndex;
            } else {
                this.persistentSelectedIndex = 0;
            }
        }

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

        this.copiedNotesBuffer = this.currentData.slice(minSel, maxSel + 1).map(item => ({
            notes: [...item.notes],
            chord: item.chord,
            lyric: item.lyric,
            bar: item.bar,
            rest: item.rest,
            tie: item.tie,
            lineBreak: item.lineBreak
        }));

        try {
            const doc = this.editIframe.contentDocument;
            const temp = doc.createElement('textarea');
            temp.value = "VEXFLOW_INTERNAL_COPY";
            doc.body.appendChild(temp);
            temp.select();
            doc.execCommand('copy');
            doc.body.removeChild(temp);
        } catch (e) { }

        console.log(`Sistema: Copiado ${this.copiedNotesBuffer.length} nota(s) da seleção.`);
    }

    pasteCopiedRange() {
        if (!this.copiedNotesBuffer || this.copiedNotesBuffer.length === 0) return;

        const clonedPaste = this.copiedNotesBuffer.map(item => ({
            notes: [...item.notes],
            chord: item.chord,
            lyric: item.lyric,
            bar: item.bar,
            rest: item.rest,
            tie: item.tie,
            lineBreak: item.lineBreak
        }));

        const insertIndex = this.persistentSelectedIndex + 1;
        this.currentData.splice(insertIndex, 0, ...clonedPaste);

        this.selectionStart = insertIndex;
        this.selectionEnd = insertIndex + clonedPaste.length - 1;
        this.persistentSelectedIndex = this.selectionEnd;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    renderizarVisualizacao(dataArray = []) {
        this.currentData = dataArray.map(l => this.normalizeItem(l));

        // CORREÇÃO: Ao carregar a partitura já deixa selecionada a primeira nota/pausa (índice 0)
        this.highlightIndex = 0;

        this.draw(this.viewIframe, false);
        if (this.onViewDrawn) this.onViewDrawn();
    }

    obterDadosParaSalvar() {
        return this.currentData.map(d => {
            let s = d.chord ? `[${d.chord}]` : "";
            s += d.notes.join(",");
            if (d.tie) s += '~';
            if (d.lyric) s += `@${d.lyric}`;
            if (d.rest) s = 'R|' + s;
            if (d.lineBreak) s = 'L|' + s;
            if (d.bar) s += `|`;
            return s;
        }).join('\n');
    }

    normalizeItem(item) {
        let str = String(item).trim();
        let chord = "", lyric = "", bar = false, rest = false, tie = false, lineBreak = false;

        if (str.startsWith('L|')) { lineBreak = true; str = str.slice(2); }
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

        return { notes, chord, lyric, bar, rest, tie, lineBreak };
    }

    getCurrentKey() {
        const tomSelect = document.getElementById('tomSelect');
        let key = tomSelect ? tomSelect.value : 'C';
        if (!key || key === '') key = 'C';

        if (this.musicTheory && this.musicTheory.acordesTomMap[key]) {
            key = this.musicTheory.acordesTomMap[key];
        }

        return key;
    }

    draw(iframe, isEditable) {
        this.convertAccidentalsToKey();
        const doc = iframe.contentDocument;
        const target = doc.getElementById('vexflow-target');
        if (!target) return;
        target.innerHTML = "";

        doc.getElementById('score-container').className = '';

        const staveHeight = 150;
        const currentKey = this.getCurrentKey();

        const lines = [];
        let currentLine = [];
        this.currentData.forEach((data, index) => {
            currentLine.push({ data, index });
            if (data.lineBreak && index !== this.currentData.length - 1) {
                lines.push(currentLine);
                currentLine = [];
            }
        });
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        const staveNotesRef = [];
        const tickablesByIndex = new Array(this.currentData.length);
        const temCifraNaPartitura = this.currentData.some(d => d.chord && d.chord.trim() !== "");
        const lyricFontSize = (!isEditable && !temCifraNaPartitura) ? 15 : 12;

        const lineDataObjects = lines.map(line => {
            let spaceNeeded = 0;

            const tickables = line.flatMap(item => {
                const { data, index } = item;

                let noteWidth = 60;
                if (data.lyric) {
                    noteWidth = Math.max(noteWidth, data.lyric.length * (lyricFontSize * 0.7));
                }
                if (data.chord) {
                    noteWidth = Math.max(noteWidth, data.chord.length * 10);
                }
                if (data.bar) noteWidth += 20;

                spaceNeeded += noteWidth;

                const note = new this.vf.StaveNote({
                    keys: data.rest ? ["b/4"] : data.notes,
                    duration: data.rest ? "qr" : "q"
                });

                staveNotesRef.push({ noteObj: note, dataObj: data });
                tickablesByIndex[index] = note;

                if (note.getStem()) note.getStem().hide = true;

                if (data.chord && !(isEditable && index === this.persistentSelectedIndex)) {
                    note.addModifier(new this.vf.ChordSymbol().setFont('Roboto', 14, 'bold').addText(data.chord), 0);
                }

                if (data.lyric && !(isEditable && index === this.persistentSelectedIndex)) {
                    note.addModifier(new this.vf.Annotation(data.lyric)
                        .setFont('Roboto', lyricFontSize, 'italic')
                        .setVerticalJustification(this.vf.Annotation.VerticalJustify.BOTTOM), 0);
                }

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

            const calculatedWidth = spaceNeeded + 150;
            const finalWidth = Math.max(iframe.clientWidth - 80, calculatedWidth);

            const voice = new this.vf.Voice({ num_beats: line.length, beat_value: 4 }).setStrict(false);
            voice.addTickables(tickables);

            return { voice, finalWidth };
        });

        let maxWidth = 0;
        lineDataObjects.forEach(obj => {
            if (obj.finalWidth > maxWidth) maxWidth = obj.finalWidth;
        });

        const renderer = new this.vf.Renderer(target, this.vf.Renderer.Backends.SVG);
        renderer.resize(maxWidth + 50, (lines.length * staveHeight) + 50);
        const context = renderer.getContext();

        let currentY = 40;

        lineDataObjects.forEach(obj => {
            const stave = new this.vf.Stave(10, currentY, obj.finalWidth);

            stave.addClef("treble").addKeySignature(currentKey).setContext(context).draw();

            this.vf.Accidental.applyAccidentals([obj.voice], currentKey);

            new this.vf.Formatter().joinVoices([obj.voice]).format([obj.voice], obj.finalWidth - 130);
            obj.voice.draw(context, stave);

            currentY += staveHeight;
        });

        const tiesToDraw = [];
        for (let i = 0; i < staveNotesRef.length; i++) {
            if (staveNotesRef[i].dataObj.tie) {
                const firstNote = staveNotesRef[i].noteObj;

                const tie = new this.vf.StaveTie({
                    first_note: firstNote,
                    last_note: null,
                    first_indices: [0]
                });

                try {
                    if (firstNote && firstNote.getTickContext()) {
                        const firstX = firstNote.getTieRightX();
                        const staveEndX = firstNote.getStave().getTieEndX();
                        tie.render_options.first_x_shift = -8;
                        tie.render_options.last_x_shift = (firstX + 25) - staveEndX;
                        tie.render_options.cp1 = 4;
                        tie.render_options.cp2 = 8;
                        tiesToDraw.push(tie);
                    }
                } catch (e) { }
            }
        }
        tiesToDraw.forEach(t => t.setContext(context).draw());

        if (isEditable) {
            this.noteXPositions = tickablesByIndex.map(n => n ? n.getAbsoluteX() : 0);
            this.noteYPositions = tickablesByIndex.map(n => n ? n.getStave().getYForLine(0) : 0);

            this.updateFloatingInputs();

            if (this.onEditDrawn) this.onEditDrawn();
            setTimeout(() => this.centralizarNoCursor(), 50);
        } else {
            const getSafeX = (n) => {
                try { return (n && n.getTickContext()) ? n.getAbsoluteX() : 0; } catch (e) { return 0; }
            };
            const getSafeY = (n) => {
                try { return (n && n.getStave()) ? n.getStave().getYForLine(0) : 0; } catch (e) { return 0; }
            };

            this.viewNoteXPositions = tickablesByIndex.map(getSafeX);
            this.viewNoteYPositions = tickablesByIndex.map(getSafeY);
            if (this.onViewDrawn) this.onViewDrawn();
            setTimeout(() => this.centralizarDestaque(), 50);
        }
    }

    applyPianoNote(pitchStr) {
        const pitch = this.getEnarmonicPitch(pitchStr);

        if (this.persistentSelectedIndex >= 0 && this.persistentSelectedIndex < this.currentData.length) {
            this.currentData[this.persistentSelectedIndex].notes = [pitch];
            this.currentData[this.persistentSelectedIndex].rest = false;
            this.lastUsedPitch = pitch;

            this.draw(this.editIframe, true);
            this.centralizarNoCursor();
        }
    }

    addNewNote() {
        let repassarQuebraDeLinha = false;
        let notasParaCopiar = ["b/4"];
        let isRest = false;

        if (this.persistentSelectedIndex >= 0) {
            const notaAtual = this.currentData[this.persistentSelectedIndex];
            if (notaAtual.lineBreak) {
                notaAtual.lineBreak = false;
                repassarQuebraDeLinha = true;
            }

            // CORREÇÃO: Se for pausa, não copia a pausa, insere nota padrão
            if (notaAtual.rest) {
                notasParaCopiar = [this.lastUsedPitch || "b/4"];
                isRest = false;
            } else {
                notasParaCopiar = [...notaAtual.notes];
                isRest = false; // Força false pois addNewNote deve sempre adicionar nota
            }
        } else {
            notasParaCopiar = [this.lastUsedPitch || "b/4"];
        }

        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: notasParaCopiar,
            chord: "",
            lyric: "",
            bar: false,
            rest: isRest,
            tie: false,
            lineBreak: repassarQuebraDeLinha
        });

        this.persistentSelectedIndex++;
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    addRest() {
        let repassarQuebraDeLinha = false;

        if (this.persistentSelectedIndex >= 0 && this.currentData[this.persistentSelectedIndex].lineBreak) {
            this.currentData[this.persistentSelectedIndex].lineBreak = false;
            repassarQuebraDeLinha = true;
        }

        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: ["b/4"],
            chord: "",
            lyric: "",
            bar: false,
            rest: true,
            tie: false,
            lineBreak: repassarQuebraDeLinha
        });

        this.persistentSelectedIndex++;
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    toggleTie() {
        if (this.persistentSelectedIndex === -1) return;
        this.currentData[this.persistentSelectedIndex].tie = !this.currentData[this.persistentSelectedIndex].tie;
        this.draw(this.editIframe, true);
    }

    toggleLineBreak() {
        if (this.persistentSelectedIndex === -1) return;
        const indexParaQuebrar = this.persistentSelectedIndex - 1;

        if (indexParaQuebrar >= 0) {
            this.currentData[indexParaQuebrar].lineBreak = !this.currentData[indexParaQuebrar].lineBreak;
            this.draw(this.editIframe, true);
        } else {
            this.draw(this.editIframe, true);
        }
    }

    deleteNoteAtCursor() {
        const start = this.selectionStart ?? this.persistentSelectedIndex;
        const end = this.selectionEnd ?? this.persistentSelectedIndex;
        const minSel = Math.min(start, end);
        const maxSel = Math.max(start, end);

        if (minSel !== maxSel) {
            this.currentData.splice(minSel, maxSel - minSel + 1);

            if (this.currentData.length === 0) {
                this.currentData = [{ notes: ["b/4"], chord: "", lyric: "", bar: false, rest: false, tie: false, lineBreak: false }];
            }

            this.persistentSelectedIndex = Math.min(minSel, this.currentData.length - 1);
        } else {
            if (this.currentData.length <= 1) {
                this.currentData[0] = { notes: ["b/4"], chord: "", lyric: "", bar: false, rest: false, tie: false, lineBreak: false };
            } else {
                const indexAnterior = this.persistentSelectedIndex - 1;

                if (this.persistentSelectedIndex > 0 && this.currentData[indexAnterior].lineBreak) {
                    this.currentData[indexAnterior].lineBreak = false;
                    // CORREÇÃO: Removi 'this.persistentSelectedIndex--;' daqui. 
                    // O foco fica exatamente na nota que você estava antes de apertar Delete/Backspace
                } else {
                    this.currentData.splice(this.persistentSelectedIndex, 1);
                    if (this.persistentSelectedIndex >= this.currentData.length) {
                        this.persistentSelectedIndex = this.currentData.length - 1;
                    }
                }
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