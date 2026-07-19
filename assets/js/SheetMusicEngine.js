class ScoreCodec {
    static encode(data) {
        return data.map(item => {
            if (item.bar) return '|';
            if (item.rest) return 'R';

            let str = item.notes[0].replace('/', '');

            if (item.chord) str += `[${item.chord}]`;
            if (item.lyric) str += `@${item.lyric}`;
            if (item.tie) str += `~`;

            return str;
        }).join(' ');
    }

    static decode(str) {
        if (!str || !str.trim()) return [];

        return str.trim().split(/\s+/).map(token => {
            if (token === '|') {
                return { notes: ["b/4"], chord: "", lyric: "", rest: false, tie: false, bar: true };
            }
            if (token === 'R') {
                return { notes: ["b/4"], chord: "", lyric: "", rest: true, tie: false, bar: false };
            }

            const pitchMatch = token.match(/^([a-gA-G][#b]?)(\d)/);
            let notes = ["c/4"];
            if (pitchMatch) {
                notes = [`${pitchMatch[1].toLowerCase()}/${pitchMatch[2]}`];
            }

            const chordMatch = token.match(/\[(.*?)\]/);
            const lyricMatch = token.match(/@([^~]*)/);
            const isTie = token.includes('~');

            return {
                notes: notes,
                chord: chordMatch ? chordMatch[1] : "",
                lyric: lyricMatch ? lyricMatch[1] : "",
                rest: false,
                tie: isTie,
                bar: false
            };
        });
    }
}

class SheetMusicEditor {
    constructor() {
        this.overlay = document.getElementById('sm-editor-overlay');
        this.target = document.getElementById('vexflow-target');
        this.vf = window.Vex.Flow;
        this.currentData = [];
        this.persistentSelectedIndex = 0;
        this.activeBlock = null;
        this.onConfirm = null;
        this.isActive = false;

        this.initUI();
    }

    initUI() {
        document.getElementById('sm-btn-prev').onclick = () => this.navegarCursor(-1);
        document.getElementById('sm-btn-next').onclick = () => this.navegarCursor(1);
        document.getElementById('sm-btn-up').onclick = () => this.alterarAltura(1);
        document.getElementById('sm-btn-down').onclick = () => this.alterarAltura(-1);
        document.getElementById('sm-btn-add').onclick = () => this.addNewNote();
        document.getElementById('sm-btn-rest').onclick = () => this.addRest();
        document.getElementById('sm-btn-tie').onclick = () => this.toggleTie();
        document.getElementById('sm-btn-delete').onclick = () => this.deleteNote();
        document.getElementById('sm-btn-oct-up').onclick = () => this.shiftOctave(1);
        document.getElementById('sm-btn-oct-down').onclick = () => this.shiftOctave(-1);
        document.getElementById('sm-btn-confirm').onclick = () => this.confirmarEdicao();

        const inputChord = document.getElementById('sm-input-chord');
        const inputLyric = document.getElementById('sm-input-lyric');

        const updateInput = (type, val) => {
            if (this.persistentSelectedIndex >= 0) {
                this.currentData[this.persistentSelectedIndex][type] = val;
                this.draw();
            }
        };

        if (inputChord && inputLyric) {
            inputChord.addEventListener('input', e => updateInput('chord', e.target.value));
            inputLyric.addEventListener('input', e => updateInput('lyric', e.target.value));
        }

        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            if (e.target.tagName.toLowerCase() === 'input') return;

            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); this.alterarAltura(1); break;
                case 'ArrowDown': e.preventDefault(); this.alterarAltura(-1); break;
                case 'ArrowLeft': e.preventDefault(); this.navegarCursor(-1); break;
                case 'ArrowRight': e.preventDefault(); this.navegarCursor(1); break;
                case 'Enter': e.preventDefault(); this.addNewNote(); break;
                case 'Backspace':
                case 'Delete': e.preventDefault(); this.deleteNote(); break;
            }
        });
    }

    open(existingData, existingBlock, onConfirm) {
        this.onConfirm = onConfirm;
        this.activeBlock = existingBlock;

        if (existingData && existingData.length > 0) {
            this.currentData = JSON.parse(JSON.stringify(existingData));
        } else {
            this.currentData = [{ notes: ["c/4"], chord: "", lyric: "", rest: false, tie: false, bar: false }];
        }

        this.persistentSelectedIndex = this.currentData.length - 1;
        this.isActive = true;
        this.overlay.classList.remove('d-none');
        this.overlay.classList.add('d-flex');
        this.draw();
    }

    close() {
        this.isActive = false;
        this.overlay.classList.add('d-none');
        this.overlay.classList.remove('d-flex');
    }

    confirmarEdicao() {
        const svgElement = this.drawStandalone(this.currentData);
        if (this.onConfirm) {
            this.onConfirm(svgElement, this.currentData, this.activeBlock);
        }
        this.close();
    }

    navegarCursor(dir) {
        let novoIndex = this.persistentSelectedIndex + dir;
        if (novoIndex >= 0 && novoIndex < this.currentData.length) {
            this.persistentSelectedIndex = novoIndex;
            this.draw();
        }
    }

    alterarAltura(direcao) {
        if (this.currentData[this.persistentSelectedIndex].rest || this.currentData[this.persistentSelectedIndex].bar) return;
        const notaAtual = this.currentData[this.persistentSelectedIndex].notes[0];
        const partes = notaAtual.split('/');

        const valoresNotas = { 'c': 0, 'c#': 1, 'd': 2, 'd#': 3, 'e': 4, 'f': 5, 'f#': 6, 'g': 7, 'g#': 8, 'a': 9, 'a#': 10, 'b': 11 };
        const arraySustenidos = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

        let valorAbsoluto = (parseInt(partes[1], 10) * 12) + (valoresNotas[partes[0].toLowerCase().replace('b', '#')] ?? 0);
        valorAbsoluto += direcao;
        valorAbsoluto = Math.max(41, Math.min(76, valorAbsoluto));

        const novaOitava = Math.floor(valorAbsoluto / 12);
        const indiceNota = valorAbsoluto % 12;

        this.currentData[this.persistentSelectedIndex].notes = [arraySustenidos[indiceNota] + '/' + novaOitava];
        this.draw();
    }

    shiftOctave(direcao) {
        this.currentData.forEach(item => {
            if (!item.rest && !item.bar) {
                item.notes = item.notes.map(note => {
                    const partes = note.split('/');
                    let oitava = parseInt(partes[1], 10) + direcao;
                    oitava = Math.max(3, Math.min(6, oitava));
                    return partes[0] + '/' + oitava;
                });
            }
        });
        this.draw();
    }

    addNewNote() {
        const lastNote = this.currentData[this.persistentSelectedIndex];
        const newPitch = lastNote && !lastNote.rest && !lastNote.bar ? lastNote.notes[0] : "c/4";

        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: [newPitch], chord: "", lyric: "", rest: false, tie: false, bar: false
        });
        this.persistentSelectedIndex++;
        this.draw();
    }

    addRest() {
        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: ["b/4"], chord: "", lyric: "", rest: true, tie: false, bar: false
        });
        this.persistentSelectedIndex++;
        this.draw();
    }

    toggleTie() {
        this.currentData[this.persistentSelectedIndex].tie = !this.currentData[this.persistentSelectedIndex].tie;
        this.draw();
    }

    deleteNote() {
        if (this.currentData.length <= 1) {
            this.currentData[0] = { notes: ["c/4"], chord: "", lyric: "", rest: false, tie: false, bar: false };
        } else {
            this.currentData.splice(this.persistentSelectedIndex, 1);
            if (this.persistentSelectedIndex >= this.currentData.length) {
                this.persistentSelectedIndex = this.currentData.length - 1;
            }
        }
        this.draw();
    }

    draw() {
        this.target.innerHTML = "";
        const inputsWrapper = document.getElementById('sm-floating-inputs');
        const staveHeight = 150;
        let spaceNeeded = 0;
        const staveNotesRef = [];

        const tickables = this.currentData.flatMap((data, index) => {
            let noteWidth = 60;
            if (data.lyric) noteWidth = Math.max(noteWidth, data.lyric.length * 10);
            if (data.chord) noteWidth = Math.max(noteWidth, data.chord.length * 12);
            if (data.bar) noteWidth += 20;
            spaceNeeded += noteWidth;

            const note = new this.vf.StaveNote({
                keys: data.rest ? ["b/4"] : data.notes,
                duration: data.rest ? "qr" : "q"
            });

            staveNotesRef.push({ noteObj: note, dataObj: data });
            if (note.getStem()) note.getStem().hide = true;

            const shouldRenderText = index !== this.persistentSelectedIndex;

            if (data.chord && shouldRenderText) {
                note.addModifier(new this.vf.ChordSymbol().setFont('Arial', 14, 'bold').addText(data.chord), 0);
            }
            if (data.lyric && shouldRenderText) {
                note.addModifier(new this.vf.Annotation(data.lyric).setFont('Arial', 12, 'italic').setVerticalJustification(this.vf.Annotation.VerticalJustify.BOTTOM), 0);
            }

            if (index === this.persistentSelectedIndex) {
                note.setStyle({ fillStyle: "#198754", strokeStyle: "#198754" });
            }
            return data.bar ? [note, new this.vf.BarNote()] : [note];
        });

        const finalWidth = Math.max(400, spaceNeeded + 100);
        const voice = new this.vf.Voice({ num_beats: this.currentData.length, beat_value: 4 }).setStrict(false);
        voice.addTickables(tickables);

        const renderer = new this.vf.Renderer(this.target, this.vf.Renderer.Backends.SVG);
        renderer.resize(finalWidth + 40, staveHeight);
        const context = renderer.getContext();

        const stave = new this.vf.Stave(10, 20, finalWidth);
        stave.addClef("treble").setContext(context).draw();

        this.vf.Accidental.applyAccidentals([voice], 'C');
        new this.vf.Formatter().joinVoices([voice]).format([voice], finalWidth - 60);
        voice.draw(context, stave);

        staveNotesRef.forEach((ref) => {
            if (ref.dataObj.tie) {
                new this.vf.StaveTie({ first_note: ref.noteObj, last_note: null, first_indices: [0] })
                    .setContext(context).draw();
            }
        });

        const activeNoteObj = tickables.find(t => t.hasClass && t.hasClass("vf-stavenote") && tickables.indexOf(t) >= this.persistentSelectedIndex) || tickables[this.persistentSelectedIndex];

        if (activeNoteObj && typeof activeNoteObj.getAbsoluteX === 'function') {
            const xPos = activeNoteObj.getAbsoluteX();
            inputsWrapper.style.display = 'block';
            inputsWrapper.style.left = xPos + 'px';

            const current = this.currentData[this.persistentSelectedIndex];
            const iChord = document.getElementById('sm-input-chord');
            const iLyric = document.getElementById('sm-input-lyric');

            if (document.activeElement !== iChord) iChord.value = current.chord || '';
            if (document.activeElement !== iLyric) iLyric.value = current.lyric || '';

            const wrapper = document.getElementById('score-scroll-area');
            const offset = wrapper.clientWidth / 2;
            wrapper.scrollTo({ left: Math.max(0, xPos - offset), behavior: 'smooth' });
        }
    }

    // Adicionado parâmetro opcional 'highlightIndex' para colorir de verde a nota atual na página principal
    drawStandalone(data, highlightIndex = -1) {
        const tempDiv = document.createElement('div');
        const staveHeight = 150;
        let spaceNeeded = 0;
        const staveNotesRef = [];

        const tickables = data.flatMap((d, index) => {
            let noteWidth = 60;
            if (d.lyric) noteWidth = Math.max(noteWidth, d.lyric.length * 10);
            if (d.chord) noteWidth = Math.max(noteWidth, d.chord.length * 12);
            if (d.bar) noteWidth += 20;

            spaceNeeded += noteWidth;

            const note = new this.vf.StaveNote({
                keys: d.rest ? ["b/4"] : d.notes,
                duration: d.rest ? "qr" : "q"
            });

            staveNotesRef.push({ noteObj: note, dataObj: d });
            if (note.getStem()) note.getStem().hide = true;

            if (d.chord) note.addModifier(new this.vf.ChordSymbol().setFont('Arial', 14, 'bold').addText(d.chord), 0);
            if (d.lyric) note.addModifier(new this.vf.Annotation(d.lyric).setFont('Arial', 12, 'italic').setVerticalJustification(this.vf.Annotation.VerticalJustify.BOTTOM), 0);

            // Aplica cor verde se for a nota atual selecionada pelo Avançar/Retroceder
            if (index === highlightIndex) {
                note.setStyle({ fillStyle: "#198754", strokeStyle: "#198754" });
            }

            return d.bar ? [note, new this.vf.BarNote()] : [note];
        });

        const finalWidth = Math.max(400, spaceNeeded + 100);
        const voice = new this.vf.Voice({ num_beats: data.length, beat_value: 4 }).setStrict(false);
        voice.addTickables(tickables);

        const renderer = new this.vf.Renderer(tempDiv, this.vf.Renderer.Backends.SVG);
        renderer.resize(finalWidth + 40, staveHeight);
        const context = renderer.getContext();

        const stave = new this.vf.Stave(10, 20, finalWidth);
        stave.addClef("treble").setContext(context).draw();

        this.vf.Accidental.applyAccidentals([voice], 'C');
        new this.vf.Formatter().joinVoices([voice]).format([voice], finalWidth - 60);
        voice.draw(context, stave);

        staveNotesRef.forEach((ref) => {
            if (ref.dataObj.tie) {
                new this.vf.StaveTie({ first_note: ref.noteObj, last_note: null, first_indices: [0] })
                    .setContext(context).draw();
            }
        });

        return tempDiv.querySelector('svg');
    }
}