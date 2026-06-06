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
        this.noteYPositions = [];
        this.persistentSelectedIndex = 0;
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
                <div style="width: 2px; background: #ccc; margin: 0 5px;"></div>
                <button class="tool-btn btn-linebreak" id="btn-linebreak" title="Quebrar Linha Após a Nota Atual">↲</button>
            </div>` : '';

        doc.body.innerHTML = `${topToolbarHtml}<div id="score-container"><div id="vexflow-target"></div></div>${sideToolbarHtml}${bottomToolbarHtml}`;

        const style = doc.createElement('style');
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap');

            body { 
                font-family: 'Roboto', sans-serif; 
                margin: 0; 
                overflow-x: auto; 
                overflow-y: auto; 
                display: flex; 
                align-items: flex-start; 
                padding-top: 60px; 
                min-height: 100vh; 
                background-color: transparent; 
            }
            #score-container { min-width: max-content; padding: 20px; padding-bottom: 120px; position: relative; }
            
            .top-toolbar { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1100; background: rgba(255,255,255,0.9); padding: 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .side-toolbar { position: fixed; right: 10px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px; z-index: 1000; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
            .bottom-toolbar { position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 1100; background: rgba(255,255,255,0.9); padding: 8px 16px; border-radius: 8px; box-shadow: 0 -4px 12px rgba(0,0,0,0.15); }
            
            .tool-btn { width: 45px; height: 45px; background: #fff; border: 1px solid #333; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; transition: all 0.1s; outline: none; }
            .tool-btn:active { transform: scale(0.9); background: #f0f0f0; }
            
            .btn-nav { color: green; font-size: 20px; border-radius: 8px; }
            .btn-bar { color: #333; font-size: 24px; border-width: 1px; }
            .btn-add { color: #2e7d32; font-size: 24px; }
            .btn-rest { color: #333; font-size: 24px; }
            .btn-tie { color: #1976d2; font-size: 28px; font-weight: normal; padding-bottom: 10px;}
            .btn-delete { color: #c62828; }
            .btn-chord { color: #d32f2f; font-size: 16px; font-family: 'Roboto', sans-serif; }
            .btn-lyric { color: #000; font-size: 16px; font-family: 'Roboto', sans-serif; }
            .btn-linebreak { color: #555; font-size: 24px; }
            
            .inline-input { 
                position: absolute; 
                transform: translateX(-50%); 
                width: 80px; 
                text-align: center; 
                font-size: 16px;
                font-weight: bold; 
                font-family: 'Roboto', sans-serif;
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
            doc.getElementById('btn-linebreak').onclick = () => this.toggleLineBreak();

            // Intercepta a Colagem (Paste) direto do sistema operacional
            doc.addEventListener('paste', (e) => {
                // Deixa o input normal funcionar se estiver editando cifra ou letra
                if (e.target && e.target.tagName.toLowerCase() === 'input') return;

                e.preventDefault();
                const pasteText = (e.clipboardData || iframe.contentWindow.clipboardData).getData('text');

                if (!pasteText) return;

                // Se o texto for a nossa flag de cópia interna, cola a seleção
                if (pasteText === "VEXFLOW_INTERNAL_COPY") {
                    this.pasteCopiedRange();
                } else {
                    // Caso contrário (copiou de outro site), executa o parser de ABC
                    this.parseABC(pasteText);
                }
            });

            doc.addEventListener('keydown', (e) => {
                if (e.target && e.target.tagName.toLowerCase() === 'input') return;

                // Apenas a Cópia fica no keydown. O Colar foi movido para o evento 'paste' acima.
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                    e.preventDefault();
                    this.copySelectedRange();
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
                            this.showInlineInput('lyric', isDead ? '' : e.key);
                        }
                        break;
                }
            });
        }
    }

    parseABC(abcText) {
        const lines = abcText.split('\n');
        let parsedData = [];
        let currentLineNotes = [];
        let currentChord = "";

        // Regex para extrair: "Cifras", [AcordesMúltiplos], Notas(com acidentes e números), Pausas, Ligaduras e Barras
        const tokenRegex = /\[[^\]]*\]|"[^"]*"|[\^_=]?[a-gA-GzZ][,']*[0-9]*\/*[0-9]*|-|\|/g;

        const parsePitch = (abcPitch) => {
            if (abcPitch.toLowerCase().startsWith('z')) return null; // Pausa

            let accidental = '';
            if (abcPitch.startsWith('^')) accidental = '#';
            else if (abcPitch.startsWith('_')) accidental = 'b';

            const cleanPitch = abcPitch.replace(/[\^_=0-9\/]/g, '');
            if (!cleanPitch) return null;

            const baseNote = cleanPitch[0];

            let octave = 4;
            if (baseNote >= 'a' && baseNote <= 'g') octave = 5;

            for (let i = 1; i < cleanPitch.length; i++) {
                if (cleanPitch[i] === ',') octave -= 1;
                else if (cleanPitch[i] === "'") octave += 1;
            }

            const finalPitch = `${baseNote.toLowerCase()}${accidental}/${octave}`;

            // Valor numérico para encontrar a mais aguda em acordes [CEG]
            const noteValues = { 'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11 };
            let numValue = octave * 12 + noteValues[baseNote.toLowerCase()];
            if (accidental === '#') numValue += 1;
            if (accidental === 'b') numValue -= 1;

            return { vfPitch: finalPitch, value: numValue };
        };

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            // Ignora outros cabeçalhos e comentários
            if (/^[A-Z]:/.test(trimmedLine) || trimmedLine.startsWith('%')) return;

            // Armadura de Clave
            if (trimmedLine.startsWith('K:')) {
                const key = trimmedLine.substring(2).trim().split(' ')[0];
                const tomSelect = document.getElementById('tomSelect');
                if (tomSelect) {
                    tomSelect.value = key;
                    tomSelect.dispatchEvent(new Event('change'));
                }
                return;
            }

            // Letra da música (Lyrics) mapeando para a última linha de notas processada
            if (trimmedLine.startsWith('w:')) {
                let lyricText = trimmedLine.substring(2).trim();

                let syllables = [];
                // Primeiro quebra por espaços
                let tokensText = lyricText.split(/\s+/);

                tokensText.forEach(token => {
                    // Conta quantos '_' existem (extensões de notas no ABC)
                    let melismaCount = (token.match(/_/g) || []).length;
                    let cleanToken = token.replace(/_/g, '');

                    if (cleanToken === '*') {
                        syllables.push(""); // O asterisco pula uma nota no ABC
                    } else if (cleanToken !== '') {
                        // Divide a palavra pelos hifens
                        let partes = cleanToken.split('-');
                        for (let i = 0; i < partes.length; i++) {
                            let syl = partes[i];
                            if (i < partes.length - 1) syl += '-'; // Mantém o tracinho visualmente para a partitura
                            syllables.push(syl);
                        }
                    }

                    // Para cada underline, insere uma nota vazia para não dessincronizar
                    for (let j = 0; j < melismaCount; j++) {
                        syllables.push("");
                    }
                });

                let lyricIdx = 0;
                for (let i = 0; i < currentLineNotes.length; i++) {
                    if (lyricIdx >= syllables.length) break;
                    if (!currentLineNotes[i].rest) {
                        if (syllables[lyricIdx]) {
                            currentLineNotes[i].lyric = syllables[lyricIdx];
                        }
                        lyricIdx++;
                    }
                }
                return;
            }

            // Ignora outros cabeçalhos informativos do ABCJS
            if (/^[A-Z]:/.test(trimmedLine)) return;

            // Processa Linha Musical
            currentLineNotes = [];
            const tokens = trimmedLine.match(tokenRegex);
            if (!tokens) return;

            tokens.forEach(token => {
                if (token.startsWith('"')) {
                    currentChord = token.replace(/"/g, '');
                }
                else if (token === '|') {
                    if (parsedData.length > 0) parsedData[parsedData.length - 1].bar = true;
                }
                else if (token === '-') {
                    if (parsedData.length > 0) parsedData[parsedData.length - 1].tie = true;
                }
                else if (token.toLowerCase().startsWith('z')) {
                    const noteObj = {
                        notes: ["b/4"], chord: currentChord, lyric: "",
                        bar: false, rest: true, tie: false, lineBreak: false
                    };
                    parsedData.push(noteObj);
                    currentLineNotes.push(noteObj);
                    currentChord = "";
                }
                else if (token.startsWith('[')) {
                    // Extrai múltiplas notas e acha a MAIS AGUDA
                    const innerPitches = token.replace(/[\[\]]/g, '').match(/[\^_=]?[a-gA-G][,']*/g);
                    if (innerPitches) {
                        let highestPitch = null;
                        let maxVal = -999;
                        innerPitches.forEach(p => {
                            const pData = parsePitch(p);
                            if (pData && pData.value > maxVal) {
                                maxVal = pData.value;
                                highestPitch = pData.vfPitch;
                            }
                        });
                        if (highestPitch) {
                            const noteObj = {
                                notes: [highestPitch], chord: currentChord, lyric: "",
                                bar: false, rest: false, tie: false, lineBreak: false
                            };
                            parsedData.push(noteObj);
                            currentLineNotes.push(noteObj);
                            currentChord = "";
                        }
                    }
                }
                else {
                    // Nota Simples
                    const pData = parsePitch(token);
                    if (pData) {
                        const noteObj = {
                            notes: [pData.vfPitch], chord: currentChord, lyric: "",
                            bar: false, rest: false, tie: false, lineBreak: false
                        };
                        parsedData.push(noteObj);
                        currentLineNotes.push(noteObj);
                        currentChord = "";
                    }
                }
            });

            // Respeita as quebras de linha do próprio ABC
            if (currentLineNotes.length > 0) {
                currentLineNotes[currentLineNotes.length - 1].lineBreak = true;
            }
        });

        if (parsedData.length > 0) {
            parsedData[parsedData.length - 1].lineBreak = false; // Remove quebra na última nota
            this.currentData = parsedData;
            this.persistentSelectedIndex = 0;
            this.selectionStart = 0;
            this.selectionEnd = 0;
            this.draw(this.editIframe, true);
        }
    }

    showInlineInput(type, initialKey = null) {
        this.commitInput();

        const doc = this.editIframe.contentDocument;
        const win = this.editIframe.contentWindow;
        const xPos = this.noteXPositions[this.persistentSelectedIndex];
        const yBase = this.noteYPositions[this.persistentSelectedIndex] || 40;

        const input = doc.createElement('input');
        input.id = 'inline-input';
        input.className = 'inline-input';
        input.style.left = xPos + 'px';
        input.style.top = (type === 'chord' ? (yBase) + 'px' : (yBase + 190) + 'px');
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

        // Injeta a flag para o sistema de colar reconhecer que é a cópia interna
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
        this.commitInput();

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

                if (data.chord) {
                    note.addModifier(new this.vf.ChordSymbol().setFont('Roboto', 14, 'bold').addText(data.chord), 0);
                }

                if (data.lyric) {
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
                    last_note: null, // Força a não grudar na próxima nota
                    first_indices: [0]
                });

                const firstX = firstNote.getTieRightX();
                const staveEndX = firstNote.getStave().getTieEndX();

                // 1. Move o ponto inicial da ligadura para a esquerda (mais "grudado" na nota)
                tie.render_options.first_x_shift = -8;

                // 2. Controla o ponto final (ajustado para dar um tamanho total de ~23px)
                tie.render_options.last_x_shift = (firstX + 25) - staveEndX;

                // 3. Ajusta a curvatura para ficar sutil e delicada junto à nota
                tie.render_options.cp1 = 4;
                tie.render_options.cp2 = 8; // Um pouquinho menor para acompanhar o recuo

                tiesToDraw.push(tie);
            }
        }
        tiesToDraw.forEach(t => t.setContext(context).draw());

        if (isEditable) {
            this.noteXPositions = tickablesByIndex.map(n => n ? n.getAbsoluteX() : 0);
            this.noteYPositions = tickablesByIndex.map(n => n ? n.getStave().getYForLine(0) : 0);
            if (this.onEditDrawn) this.onEditDrawn();
            setTimeout(() => this.centralizarNoCursor(), 50);
        } else {
            this.viewNoteXPositions = tickablesByIndex.map(n => n ? n.getAbsoluteX() : 0);
            this.viewNoteYPositions = tickablesByIndex.map(n => n ? n.getStave().getYForLine(0) : 0);
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

        let repassarQuebraDeLinha = false;

        // Valores padrão caso algo dê errado
        let notasParaCopiar = ["b/4"];
        let isRest = false;

        // Verifica se existe uma nota selecionada atualmente
        if (this.persistentSelectedIndex >= 0) {
            const notaAtual = this.currentData[this.persistentSelectedIndex];

            // Lógica 1: Repassa a quebra de linha (que fizemos agora pouco)
            if (notaAtual.lineBreak) {
                notaAtual.lineBreak = false;
            repassarQuebraDeLinha = true;
        }

            // Lógica 2: Clona as notas e o estado de pausa da nota atual
            // O [...array] cria uma cópia independente das notas
            notasParaCopiar = [...notaAtual.notes];
            isRest = notaAtual.rest;
        } else {
            // Fallback: se o editor estiver vazio, tenta usar o lastUsedPitch
            notasParaCopiar = [this.lastUsedPitch || "b/4"];
        }

        // Insere a nova nota clonando os dados
        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: [this.lastUsedPitch],
            chord: "",
            lyric: "",
            bar: false,
            rest: false,
            tie: false,
            lineBreak: repassarQuebraDeLinha // A nova nota herda a quebra, se houver
        });

        this.persistentSelectedIndex++;
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    addRest() {
        this.commitInput();

        let repassarQuebraDeLinha = false;

        // Mesma lógica da nota normal: rouba a quebra se existir
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
            lineBreak: repassarQuebraDeLinha // A nova pausa herda a quebra
        });

        this.persistentSelectedIndex++;
        this.selectionStart = this.persistentSelectedIndex;
        this.selectionEnd = this.persistentSelectedIndex;

        this.draw(this.editIframe, true);
        this.centralizarNoCursor();
    }

    toggleTie() {
        // Removido o bloqueio que impedia ativar ligadura na última nota
        if (this.persistentSelectedIndex === -1) return;

        this.currentData[this.persistentSelectedIndex].tie = !this.currentData[this.persistentSelectedIndex].tie;
        this.draw(this.editIframe, true);
    }

    toggleLineBreak() {
        if (this.persistentSelectedIndex === -1) return;

        // CORREÇÃO: Se quisermos que a nota atual comece uma nova linha, 
        // a quebra deve ocorrer na nota ANTERIOR (index - 1).
        const indexParaQuebrar = this.persistentSelectedIndex - 1;

        if (indexParaQuebrar >= 0) {
            this.currentData[indexParaQuebrar].lineBreak = !this.currentData[indexParaQuebrar].lineBreak;
            this.draw(this.editIframe, true);
        } else {
            // Se for a primeira nota, não faz sentido quebrar antes dela, 
            // mas podemos apenas redesenhar.
            this.draw(this.editIframe, true);
        }
    }

    deleteNoteAtCursor() {
        if (this.currentData.length <= 1) {
            // Se só tem uma nota, apenas reseta ela
            this.currentData[0] = { notes: ["b/4"], chord: "", lyric: "", bar: false, rest: false, tie: false, lineBreak: false };
        } else {
            // VERIFICA SE A NOTA ANTERIOR TEM QUEBRA DE LINHA
            if (this.persistentSelectedIndex > 0 && this.currentData[this.persistentSelectedIndex - 1].lineBreak) {

                // Apenas remove a quebra de linha (unindo as pautas)
                this.currentData[this.persistentSelectedIndex - 1].lineBreak = false;

                // Opcional, mas dá uma UX ótima: move o cursor para a nota que tinha a quebra
                this.persistentSelectedIndex--;

            } else {
                // Comportamento normal: Deleta a nota atual
                this.currentData.splice(this.persistentSelectedIndex, 1);

                // Evita que o cursor saia dos limites do array
                if (this.persistentSelectedIndex >= this.currentData.length) {
                    this.persistentSelectedIndex = this.currentData.length - 1;
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