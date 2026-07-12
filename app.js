/**
 * Gerencia a troca de tema (Claro / Escuro)
 */
class ThemeManager {
    constructor() {
        this.btnToggle = document.getElementById('btn-theme-toggle');
        this.iconTheme = document.getElementById('icon-theme');
        this.htmlElement = document.documentElement;
        this.init();
    }

    init() {
        const currentTheme = localStorage.getItem('theme');
        this.setTheme(currentTheme === 'dark');

        this.btnToggle.addEventListener('click', () => {
            const isCurrentlyDark = this.htmlElement.getAttribute('data-bs-theme') === 'dark';
            this.setTheme(!isCurrentlyDark);
        });
    }

    setTheme(isDark) {
        const theme = isDark ? 'dark' : 'light';
        this.htmlElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);

        if (isDark) {
            this.iconTheme.classList.replace('bi-moon-fill', 'bi-sun-fill');
            this.iconTheme.style.color = "#ffc107";
        } else {
            this.iconTheme.classList.replace('bi-sun-fill', 'bi-moon-fill');
            this.iconTheme.style.color = "";
        }
    }
}

/**
 * Gerencia a troca de idioma importando os dados do arquivo JSON
 */
class LanguageManager {
    constructor(tomSelectInstance) {
        this.btnLangToggle = document.getElementById('btn-language-toggle');
        this.iconFlag = document.getElementById('icon-flag');
        this.tomSelectInstance = tomSelectInstance;

        const systemLang = navigator.language || navigator.userLanguage;
        this.currentLang = systemLang.startsWith('en') ? 'en' : 'pt';
        this.translations = {};

        this.loadTranslations();
    }

    async loadTranslations() {
        try {
            // Aponta diretamente para o local absoluto no seu servidor beta
            const response = await fetch('https://roneicostasoares.com.br/orgao.web.beta/translations.json');

            if (!response.ok) {
                throw new Error('Falha no carregamento do arquivo JSON');
            }

            this.translations = await response.json();
            this.init();
        } catch (error) {
            console.error("Aviso: Falha ao carregar as traduções.", error);
        }
    }

    init() {
        this.btnLangToggle.addEventListener('click', () => {
            if (this.currentLang === 'pt') {
                this.currentLang = 'en';
            } else {
                this.currentLang = 'pt';
            }
            this.updateInterface();
        });

        this.updateInterface();
    }

    updateInterface() {
        const dict = this.getDict();
        if (!dict) return;

        // Atualiza a bandeira
        this.iconFlag.innerText = this.currentLang === 'pt' ? '🇧🇷' : '🇺🇸';

        // Atualiza elementos com data-i18n (textos normais)
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerText = dict[key];
            }
        });

        // Atualiza elementos com data-i18n-placeholder (inputs)
        const i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]');
        i18nPlaceholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) {
                el.placeholder = dict[key];
            }
        });

        // Atualiza o select de músicas
        if (this.tomSelectInstance) {
            this.tomSelectInstance.settings.placeholder = dict.chooseSong;
            this.tomSelectInstance.control_input.placeholder = dict.chooseSong;
        }
    }

    getDict() {
        return this.translations[this.currentLang] || {};
    }
}

/**
 * Classe utilitária para chamar Modais dinâmicos
 */
class ModalManager {
    constructor(languageManager) {
        this.langManager = languageManager;

        this.modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        this.titleEl = document.getElementById('confirmModalTitle');
        this.bodyEl = document.getElementById('confirmModalBody');

        this.btnNo = document.getElementById('btn-confirm-no');
        this.btnYes = document.getElementById('btn-confirm-yes');
    }

    show(titleKey, bodyKey, onConfirmCallback, showCancelButton = true) {
        const dict = this.langManager.getDict();

        this.titleEl.innerText = dict[titleKey] || titleKey;
        this.bodyEl.innerText = dict[bodyKey] || bodyKey;
        this.btnNo.innerText = dict['no'] || 'Não';

        if (showCancelButton) {
            this.btnNo.classList.remove('d-none');
            this.btnYes.innerText = dict['yes'] || 'Sim';
        } else {
            this.btnNo.classList.add('d-none');
            this.btnYes.innerText = 'OK';
        }

        // Remove listeners antigos do botão clonando-o (evita cliques múltiplos)
        const newBtnYes = this.btnYes.cloneNode(true);
        this.btnYes.parentNode.replaceChild(newBtnYes, this.btnYes);
        this.btnYes = newBtnYes;

        this.btnYes.addEventListener('click', () => {
            this.modal.hide();
            if (onConfirmCallback) {
                onConfirmCallback();
            }
        });

        this.modal.show();
    }
}

/**
 * Abstração pura de Banco de Dados Local
 */
class DatabaseManager {
    constructor() {
        this.STORAGE_KEY = 'songs';
    }

    getSongs() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return [];
    }

    saveSongs(songs) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(songs));
    }

    addSong(title, content) {
        const songs = this.getSongs();
        const newSong = { id: Date.now().toString(), title, content };

        songs.push(newSong);
        this.saveSongs(songs);

        return newSong;
    }

    updateSong(id, title, content) {
        const songs = this.getSongs();
        const index = songs.findIndex(s => s.id === id);

        if (index > -1) {
            songs[index] = { ...songs[index], title, content };
            this.saveSongs(songs);
            return songs[index];
        }

        return null;
    }

    deleteSong(id) {
        let songs = this.getSongs();
        songs = songs.filter(s => s.id !== id);
        this.saveSongs(songs);
    }

    getSongById(id) {
        const songs = this.getSongs();
        return songs.find(s => s.id === id);
    }
}

/**
 * Controla as Telas Principais (Cifra/Partitura, Liturgia, Modo de Edição)
 */
class ViewManager {
    constructor() {
        this.mainDisplay = document.getElementById('main-display');
        this.mainIframe = document.getElementById('main-iframe');

        this.wrapperSelect = document.getElementById('wrapper-song-select');
        this.inputTitle = document.getElementById('song-title-input');

        this.btnToggle = document.getElementById('btn-action-toggle');
        this.btnAdd = document.getElementById('btn-action-add');
        this.btnEdit = document.getElementById('btn-action-edit');
        this.btnDelete = document.getElementById('btn-action-delete');
        this.btnSave = document.getElementById('btn-action-save');
        this.btnCancel = document.getElementById('btn-action-cancel');

        this.btnAddSheetMusic = document.getElementById('btn-add-sheet-music');
        this.onHydrateScores = null; // Callback para renderizar SVGs ao carregar texto do banco

        this.initPasteHandling();
    }

    initPasteHandling() {
        this.mainDisplay.addEventListener('paste', (e) => {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData;
            const text = clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }

    showLiturgy() {
        this.mainDisplay.classList.add('d-none');
        this.mainIframe.classList.remove('d-none');

        const currentSrc = this.mainIframe.src;
        if (!currentSrc || currentSrc === window.location.href) {
            this.mainIframe.src = "https://liturgiadiaria.edicoescnbb.com.br/";
        }
    }

    showRepertoire(content = '') {
        this.mainIframe.classList.add('d-none');
        this.mainDisplay.classList.remove('d-none');
        this.mainDisplay.setAttribute('contenteditable', 'false');
        this.mainDisplay.innerHTML = content;

        if (this.onHydrateScores) this.onHydrateScores(); // Dispara o desenho dos SVGs

        this.toggleEditTopBar(false);
    }

    enterEditMode(title = '', content = '') {
        this.mainIframe.classList.add('d-none');
        this.mainDisplay.classList.remove('d-none');
        this.mainDisplay.setAttribute('contenteditable', 'true');
        this.mainDisplay.innerHTML = content;

        if (this.onHydrateScores) this.onHydrateScores(); // Dispara o desenho dos SVGs

        this.mainDisplay.focus();
        this.inputTitle.value = title;
        this.toggleEditTopBar(true);
    }

    toggleEditTopBar(isEditing) {
        if (isEditing) {
            this.wrapperSelect.classList.add('d-none');
            this.inputTitle.classList.remove('d-none');

            this.btnToggle.classList.add('d-none');
            this.btnAdd.classList.add('d-none');
            this.btnEdit.classList.add('d-none');
            this.btnDelete.classList.add('d-none');

            this.btnSave.classList.remove('d-none');
            this.btnCancel.classList.remove('d-none');

            if (this.btnAddSheetMusic) {
                this.btnAddSheetMusic.classList.remove('d-none');
                this.btnAddSheetMusic.classList.add('d-flex');
            }
        } else {
            this.inputTitle.classList.add('d-none');
            this.wrapperSelect.classList.remove('d-none');

            this.btnSave.classList.add('d-none');
            this.btnCancel.classList.add('d-none');

            this.btnToggle.classList.remove('d-none');
            this.btnAdd.classList.add('d-none');
            this.btnEdit.classList.add('d-none');
            this.btnDelete.classList.add('d-none');

            if (this.btnAddSheetMusic) {
                this.btnAddSheetMusic.classList.add('d-none');
                this.btnAddSheetMusic.classList.remove('d-flex');
            }
        }
    }

    toggleInlineActions(show) {
        if (show) {
            this.btnToggle.classList.add('d-none');
            this.btnAdd.classList.remove('d-none');
            this.btnEdit.classList.remove('d-none');
            this.btnDelete.classList.remove('d-none');
        } else {
            this.btnToggle.classList.remove('d-none');
            this.btnAdd.classList.add('d-none');
            this.btnEdit.classList.add('d-none');
            this.btnDelete.classList.add('d-none');
        }
    }

    getEditorData() {
        // Clona o elemento em memória para podermos manipular sem afetar a tela
        const clone = this.mainDisplay.cloneNode(true);

        // --- 1. MÁGICA: Auto-formatação de Cifras ---
        this.autoFormatChords(clone);

        // --- 2. MÁGICA: Limpeza dos SVGs (Salva apenas a Div com data-score) ---
        const blocks = clone.querySelectorAll('.sheet-music-block');
        blocks.forEach(block => {
            block.innerHTML = '';
        });

        return {
            title: this.inputTitle.value.trim(),
            content: clone.innerHTML // Retorna o código limpo, leve e formatado!
        };
    }

    // Motor Inteligente que encontra linhas de acordes e coloca em negrito
    autoFormatChords(root) {
        // 1. Remove tags <b> ou <strong> que já existam para não ter negrito duplo
        const existingBold = root.querySelectorAll('b, strong');
        existingBold.forEach(b => {
            const fragment = document.createDocumentFragment();
            while (b.firstChild) fragment.appendChild(b.firstChild);
            b.parentNode.replaceChild(fragment, b);
        });

        // 2. Expressão Regular (Regex) Suprema de Acordes e Lista de Exceções
        const chordRegex = /^[CDEFGAB][#b]?(m|M|maj|dim|aug|sus)?\d*(?:\(?[#b]?\d+\)?)?(?:\/[CDEFGAB][#b]?)?$/;
        const exceptions = ['intro', 'solo', 'refrão', 'refrao', 'ponte', 'bis', 'pausa', 'fim', 'coda'];

        const isChordLine = (text) => {
            if (!text || text.trim() === '') return false;
            const tokens = text.trim().split(/\s+/);

            let hasChord = false;
            for (let token of tokens) {
                // Limpa símbolos ao redor da palavra (ex: "Intro:", "(2x)", "|")
                const cleanToken = token.toLowerCase().replace(/[()[\]:,|]/g, '');

                if (cleanToken === '') continue; // Era só um símbolo

                if (chordRegex.test(token)) {
                    hasChord = true;
                } else if (!exceptions.includes(cleanToken) && !/^\d+x$/.test(cleanToken)) {
                    // Se a palavra não é acorde, não está nas exceções e não é "2x", "3x"...
                    return false; // A linha falhou, é uma linha de texto/letra normal
                }
            }
            return hasChord; // É linha de cifra se passou no teste e tem ao menos 1 acorde
        };

        // 3. Varrer a árvore HTML buscando as linhas
        let currentLineNodes = [];
        let currentLineText = "";

        const processLine = () => {
            if (isChordLine(currentLineText)) {
                // É linha de cifra! Pega os nós de texto dessa linha e bota <b> nos acordes
                currentLineNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        // Divide pelos espaços mantendo a exata formatação (importante para alinhar a cifra)
                        const parts = node.nodeValue.split(/(\s+)/);
                        const fragment = document.createDocumentFragment();

                        parts.forEach(part => {
                            if (part.trim() !== '' && chordRegex.test(part)) {
                                const b = document.createElement('b');
                                b.textContent = part;
                                fragment.appendChild(b);
                            } else {
                                fragment.appendChild(document.createTextNode(part));
                            }
                        });
                        node.parentNode.replaceChild(fragment, node);
                    }
                });
            }
            currentLineNodes = [];
            currentLineText = "";
        };

        const walk = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Se for quebra de linha ou bloco (DIV, P, BR), processa a linha anterior
                const isBlock = ['DIV', 'P', 'BR', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName);

                if (isBlock) processLine();

                // Se for um bloco de partitura, tratamos como "texto inválido" para forçar o cancelamento 
                // da detecção de cifra nessa linha (evita bugar a linha)
                if (node.classList && node.classList.contains('sheet-music-block')) {
                    currentLineText += " [PARTITURA] ";
                    return;
                }

                // Desce nas ramificações (filhos)
                node.childNodes.forEach(walk);

                if (isBlock) processLine();

            } else if (node.nodeType === Node.TEXT_NODE) {
                currentLineNodes.push(node);
                currentLineText += node.nodeValue;
            }
        };

        walk(root);
        processLine(); // Processa a última linha que sobrou
    }
}

class ScoreCodec {
    static encode(data) {
        return data.map(item => {
            if (item.bar) return '|';
            if (item.rest) return 'R';

            let str = item.notes[0].replace('/', ''); // Transforma "c/4" em "c4"

            if (item.chord) str += `[${item.chord}]`; // Cifra
            if (item.lyric) str += `@${item.lyric}`;  // Letra (Novo padrão com @)
            if (item.tie) str += `~`;                 // Ligadura

            return str;
        }).join(' ');
    }

    static decode(str) {
        if (!str || !str.trim()) return [];

        return str.trim().split(/\s+/).map(token => {
            // Decodifica a barra de compasso
            if (token === '|') {
                return { notes: ["b/4"], chord: "", lyric: "", rest: false, tie: false, bar: true };
            }
            // Decodifica a Pausa
            if (token === 'R') {
                return { notes: ["b/4"], chord: "", lyric: "", rest: true, tie: false, bar: false };
            }

            // Lê a nota (Ex: c4, f#5, bb4)
            const pitchMatch = token.match(/^([a-gA-G][#b]?)(\d)/);
            let notes = ["c/4"];
            if (pitchMatch) {
                notes = [`${pitchMatch[1].toLowerCase()}/${pitchMatch[2]}`];
            }

            // Lê a cifra, letra (parando se encontrar o ~) e ligadura
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

/**
 * Editor Interativo de Partituras (Integração VexFlow)
 */
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

        // Atalhos de teclado quando o editor está aberto
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
            // Nota padrão inicial (Dó4)
            this.currentData = [{ notes: ["c/4"], chord: "", lyric: "", rest: false, tie: false }];
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
        const svgElement = this.draw(true); // renderiza limpo sem os cursores e inputs
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
        if (this.currentData[this.persistentSelectedIndex].rest) return;
        const notaAtual = this.currentData[this.persistentSelectedIndex].notes[0];
        const partes = notaAtual.split('/');

        const valoresNotas = { 'c': 0, 'c#': 1, 'd': 2, 'd#': 3, 'e': 4, 'f': 5, 'f#': 6, 'g': 7, 'g#': 8, 'a': 9, 'a#': 10, 'b': 11 };
        const arraySustenidos = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

        let valorAbsoluto = (parseInt(partes[1], 10) * 12) + (valoresNotas[partes[0].toLowerCase().replace('b', '#')] ?? 0);
        valorAbsoluto += direcao;
        valorAbsoluto = Math.max(41, Math.min(76, valorAbsoluto)); // Limite F3 a E6

        const novaOitava = Math.floor(valorAbsoluto / 12);
        const indiceNota = valorAbsoluto % 12;

        this.currentData[this.persistentSelectedIndex].notes = [arraySustenidos[indiceNota] + '/' + novaOitava];
        this.draw();
    }

    shiftOctave(direcao) {
        this.currentData.forEach(item => {
            if (!item.rest) {
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
        const newPitch = lastNote && !lastNote.rest ? lastNote.notes[0] : "c/4";

        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: [newPitch], chord: "", lyric: "", rest: false, tie: false
        });
        this.persistentSelectedIndex++;
        this.draw();
    }

    addRest() {
        this.currentData.splice(this.persistentSelectedIndex + 1, 0, {
            notes: ["b/4"], chord: "", lyric: "", rest: true, tie: false
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
            this.currentData[0] = { notes: ["c/4"], chord: "", lyric: "", rest: false, tie: false };
        } else {
            this.currentData.splice(this.persistentSelectedIndex, 1);
            if (this.persistentSelectedIndex >= this.currentData.length) {
                this.persistentSelectedIndex = this.currentData.length - 1;
            }
        }
        this.draw();
    }

    draw(clean = false) {
        this.target.innerHTML = "";
        const inputsWrapper = document.getElementById('sm-floating-inputs');
        const staveHeight = 150;
        let spaceNeeded = 0;
        const staveNotesRef = [];

        const tickables = this.currentData.map((data, index) => {
            let noteWidth = 60;
            if (data.lyric) noteWidth = Math.max(noteWidth, data.lyric.length * 10);
            if (data.chord) noteWidth = Math.max(noteWidth, data.chord.length * 12);
            spaceNeeded += noteWidth;

            const note = new this.vf.StaveNote({
                keys: data.rest ? ["b/4"] : data.notes,
                duration: data.rest ? "qr" : "q"
            });

            staveNotesRef.push({ noteObj: note, dataObj: data });
            if (note.getStem()) note.getStem().hide = true;

            const shouldRenderText = clean || index !== this.persistentSelectedIndex;

            if (data.chord && shouldRenderText) {
                note.addModifier(new this.vf.ChordSymbol().setFont('Arial', 14, 'bold').addText(data.chord), 0);
            }
            if (data.lyric && shouldRenderText) {
                note.addModifier(new this.vf.Annotation(data.lyric).setFont('Arial', 12, 'italic').setVerticalJustification(this.vf.Annotation.VerticalJustify.BOTTOM), 0);
            }

            if (!clean && index === this.persistentSelectedIndex) {
                note.setStyle({ fillStyle: "#198754", strokeStyle: "#198754" });
            }
            return note;
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

        if (!clean) {
            const activeNoteObj = tickables[this.persistentSelectedIndex];
            if (activeNoteObj) {
                const xPos = activeNoteObj.getAbsoluteX();
                inputsWrapper.style.display = 'block';
                inputsWrapper.style.left = xPos + 'px';

                const current = this.currentData[this.persistentSelectedIndex];
                const iChord = document.getElementById('sm-input-chord');
                const iLyric = document.getElementById('sm-input-lyric');

                if (document.activeElement !== iChord) iChord.value = current.chord || '';
                if (document.activeElement !== iLyric) iLyric.value = current.lyric || '';
            }
        } else {
            if (inputsWrapper) inputsWrapper.style.display = 'none';
        }

        if (!clean) {
            const wrapper = document.getElementById('score-scroll-area');
            const activeX = tickables[this.persistentSelectedIndex]?.getAbsoluteX() || 0;
            const offset = wrapper.clientWidth / 2;
            wrapper.scrollTo({ left: Math.max(0, activeX - offset), behavior: 'smooth' });
        }

        return this.target.querySelector('svg').cloneNode(true);
    }

    // Desenha um SVG isolado sem usar a interface do editor (para quando a música é carregada da memória)
    generateSvgFromData(data) {
        const tempDiv = document.createElement('div');
        const staveHeight = 150;
        let spaceNeeded = 0;
        const staveNotesRef = [];

        // flatMap porque o compasso (bar) adiciona um novo elemento visual no array
        const tickables = data.flatMap((d) => {
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

        return tempDiv.querySelector('svg'); // Retorna apenas a imagem final SVG
    }
}

/**
 * Gerencia a lógica dos botões de BPM (Soma, Subtrai, Valida limites)
 */
class BpmManager {
    constructor() {
        this.input = document.getElementById('bpm-input');

        this.btnMinus5 = document.getElementById('btn-bpm-minus-5');
        this.btnMinus1 = document.getElementById('btn-bpm-minus-1');
        this.btnPlus5 = document.getElementById('btn-bpm-plus-5');

        this.init();
    }

    init() {
        if (!this.input) return;

        this.btnMinus5.addEventListener('click', () => this.changeBpm(-5));
        this.btnMinus1.addEventListener('click', () => this.changeBpm(-1));
        this.btnPlus5.addEventListener('click', () => this.changeBpm(5));

        // Validação quando o usuário digita manualmente e tira o foco
        this.input.addEventListener('change', () => {
            let value = parseInt(this.input.value, 10);

            // Ajuste dos limites para 1 e 999
            if (isNaN(value) || value < 1) {
                value = 1;
            } else if (value > 999) {
                value = 999;
            }

            this.input.value = value;
        });
    }

    changeBpm(amount) {
        let currentValue = parseInt(this.input.value, 10);

        if (isNaN(currentValue)) {
            currentValue = 90;
        }

        let newValue = currentValue + amount;

        // Ajuste dos limites para 1 e 999 nos botões de incremento/decremento
        if (newValue < 1) {
            newValue = 1;
        } else if (newValue > 999) {
            newValue = 999;
        }

        this.input.value = newValue;
    }
}

/**
 * Controlador de Exportação / Importação (Arquivos JSON)
 */
class BackupManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.onImportComplete = null;

        this.initExport();
        this.initImport();
    }

    initExport() {
        const modalEl = document.getElementById('exportModal');
        const exportList = document.getElementById('export-list');
        const exportSelectAll = document.getElementById('export-select-all');
        const btnConfirm = document.getElementById('btn-confirm-export');

        // Sempre que o modal abrir, monta a lista de opções na tela
        modalEl.addEventListener('show.bs.modal', () => {
            exportList.innerHTML = '';

            const songs = this.db.getSongs();
            songs.forEach(song => {
                exportList.innerHTML += `
                    <div class="form-check">
                        <input class="form-check-input export-cb" type="checkbox" value="${song.id}" checked>
                        <label class="form-check-label">${song.title}</label>
                    </div>`;
            });

            exportSelectAll.checked = true;
        });

        // Toggle para selecionar/desmarcar tudo
        exportSelectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.export-cb');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });

        // Ação de download
        btnConfirm.addEventListener('click', () => {
            const checkedElements = Array.from(document.querySelectorAll('.export-cb:checked'));
            const selectedIds = checkedElements.map(cb => cb.value);

            const allSongs = this.db.getSongs();
            const songsToExport = allSongs.filter(song => selectedIds.includes(song.id));

            const blob = new Blob([JSON.stringify(songsToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `repertorio_${new Date().toISOString().split('T')[0]}.json`;
            anchor.click();

            URL.revokeObjectURL(url);
            bootstrap.Modal.getInstance(modalEl).hide();
        });
    }

    initImport() {
        const modalEl = document.getElementById('importModal');
        const fileInput = document.getElementById('import-file-input');
        const selectionArea = document.getElementById('import-selection-area');
        const importList = document.getElementById('import-list');
        const selectAll = document.getElementById('import-select-all');
        const btnConfirm = document.getElementById('btn-confirm-import');

        let loadedImportSongs = [];

        // Limpa os dados se o modal for fechado sem finalizar
        modalEl.addEventListener('hidden.bs.modal', () => {
            fileInput.value = '';
            selectionArea.classList.add('d-none');
            btnConfirm.classList.add('d-none');
            loadedImportSongs = [];
        });

        // Dispara quando o usuário escolhe um arquivo do computador
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    loadedImportSongs = JSON.parse(event.target.result);
                    importList.innerHTML = '';

                    loadedImportSongs.forEach((song, index) => {
                        importList.innerHTML += `
                            <div class="form-check">
                                <input class="form-check-input import-cb" type="checkbox" value="${index}" checked>
                                <label class="form-check-label">${song.title}</label>
                            </div>`;
                    });

                    selectionArea.classList.remove('d-none');
                    btnConfirm.classList.remove('d-none');
                    selectAll.checked = true;

                } catch (err) {
                    alert('Arquivo JSON inválido.');
                }
            };

            reader.readAsText(file);
        });

        selectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.import-cb');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });

        btnConfirm.addEventListener('click', () => {
            const checkedElements = Array.from(document.querySelectorAll('.import-cb:checked'));
            const selectedIndexes = checkedElements.map(cb => parseInt(cb.value, 10));

            const songsToImport = loadedImportSongs.filter((song, index) => selectedIndexes.includes(index));
            const currentSongs = this.db.getSongs();

            songsToImport.forEach(song => {
                // Gera um ID novo e seguro para cada música importada
                song.id = Date.now().toString() + Math.random().toString().substring(2, 5);
                currentSongs.push(song);
            });

            this.db.saveSongs(currentSongs);

            if (this.onImportComplete) {
                this.onImportComplete();
            }

            bootstrap.Modal.getInstance(modalEl).hide();
            alert(`${songsToImport.length} música(s) importada(s) com sucesso!`);
        });
    }
}

/**
 * Controller Central: Une o Banco de Dados, Views, Modais e TomSelect
 */
class RepertoireController {
    constructor(ts, dbManager, viewManager, modalManager, backupManager) {
        this.ts = ts;
        this.db = dbManager;
        this.view = viewManager;
        this.modal = modalManager;

        this.currentMode = 'view'; // 'view', 'add', 'edit'
        this.currentSongId = null;

        backupManager.onImportComplete = () => this.refreshSelectOptions();

        this.initEvents();
        this.refreshSelectOptions();
    }

    initEvents() {
        // Quando o usuário seleciona uma música na lista
        this.ts.on('change', (selectedId) => {
            this.currentSongId = selectedId;
            if (selectedId || selectedId === '') {
                const song = this.db.getSongById(selectedId);
                this.view.showRepertoire(song ? song.content : '');
            }
        });

        // Quando o usuário abre o dropdown, queremos ter certeza de esconder os botões de ação
        this.ts.on('dropdown_open', () => {
            this.view.toggleInlineActions(false);
        });

        // Exibir ações (Adicionar, Editar, Excluir)
        this.view.btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.view.toggleInlineActions(true);
        });

        // Esconder ações caso clique fora
        document.addEventListener('click', (e) => {
            const isAdd = e.target.closest('#btn-action-add');
            const isEdit = e.target.closest('#btn-action-edit');
            const isDelete = e.target.closest('#btn-action-delete');
            const isToggle = e.target.closest('#btn-action-toggle');

            const actionsAreVisible = !this.view.btnAdd.classList.contains('d-none');

            if (actionsAreVisible && !isAdd && !isEdit && !isDelete && !isToggle) {
                this.view.toggleInlineActions(false);
            }
        });

        // Botões de Ação
        this.view.btnAdd.addEventListener('click', () => this.handleEditRequest(true));
        this.view.btnEdit.addEventListener('click', () => this.handleEditRequest(false));

        this.view.btnDelete.addEventListener('click', () => {
            if (!this.currentSongId) return;

            this.modal.show('confirmDeleteTitle', 'confirmDeleteBody', () => {
                this.db.deleteSong(this.currentSongId);
                this.currentSongId = null;

                this.refreshSelectOptions();
                this.view.showRepertoire('');
            });
        });

        this.view.btnSave.addEventListener('click', () => this.handleSave());
        this.view.btnCancel.addEventListener('click', () => {
            this.modal.show('confirmCancelTitle', 'confirmCancelBody', () => {
                this.currentMode = 'view';
                const song = this.db.getSongById(this.currentSongId);
                this.view.showRepertoire(song ? song.content : '');
            });
        });
    }

    refreshSelectOptions() {
        this.ts.clear(true);
        this.ts.clearOptions();

        const allSongs = this.db.getSongs();
        allSongs.forEach(song => {
            this.ts.addOption({ value: song.id, text: song.title });
        });

        if (this.currentSongId && this.db.getSongById(this.currentSongId)) {
            this.ts.setValue(this.currentSongId, true);
        }
    }

    handleEditRequest(isNew) {
        this.currentMode = isNew ? 'add' : 'edit';

        if (!isNew && !this.currentSongId) {
            alert('Selecione uma música para editar primeiro.');
            this.currentMode = 'view';
            return;
        }

        if (isNew) {
            this.currentSongId = null;
            this.ts.setValue('', true);
            this.view.enterEditMode('', '');
        } else {
            const song = this.db.getSongById(this.currentSongId);
            this.view.enterEditMode(song.title, song.content);
        }
    }

    handleSave() {
        const { title, content } = this.view.getEditorData();

        if (!title) {
            alert('O título da música não pode estar vazio!');
            return;
        }

        const allSongs = this.db.getSongs();
        const isDuplicate = allSongs.some(song => {
            const hasSameName = song.title.toLowerCase() === title.toLowerCase();
            const isNotTheCurrentSong = song.id !== this.currentSongId;
            return hasSameName && isNotTheCurrentSong;
        });

        if (isDuplicate) {
            this.modal.show('duplicateTitle', 'duplicateBody', null, false);
            return;
        }

        this.modal.show('confirmSaveTitle', 'confirmSaveBody', () => {
            let savedSong;
            if (this.currentMode === 'add') {
                savedSong = this.db.addSong(title, content);
                this.currentSongId = savedSong.id;
            } else {
                savedSong = this.db.updateSong(this.currentSongId, title, content);
            }

            this.currentMode = 'view';
            this.refreshSelectOptions();
            this.ts.setValue(this.currentSongId, true);

            // CORREÇÃO: Força a interface a sair do modo de edição e carregar o novo conteúdo
            this.view.showRepertoire(savedSong ? savedSong.content : '');
        });
    }
}

/**
 * Gerencia a abertura da Liturgia Diária
 */
class LiturgyManager {
    constructor(ts, viewManager) {
        this.btnLiturgy = document.getElementById('btn-liturgy');
        this.ts = ts;
        this.view = viewManager;
        this.init();
    }

    init() {
        if (!this.btnLiturgy) return;

        this.btnLiturgy.addEventListener('click', (e) => {
            e.preventDefault();

            // Fecha o Offcanvas de maneira limpa
            const offcanvasEl = document.getElementById('sideMenu');
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasEl);
            if (offcanvasInstance) {
                offcanvasInstance.hide();
            }

            // Limpa a seleção do Dropdown (deixa vazio) e exibe o iframe
            this.ts.setValue('', true);
            this.view.showLiturgy();
        });
    }
}

class PlaybackManager {
    constructor() {
        this.btnPlay = document.getElementById('btn-play');
        this.iconPlay = document.getElementById('icon-play');
        this.isPlaying = false;
        this.onStopCallback = null;

        this.btnPlay.addEventListener('click', () => this.setPlayState(!this.isPlaying));
    }

    onStop(callback) {
        this.onStopCallback = callback;
    }

    setPlayState(state) {
        this.isPlaying = state;
        if (this.isPlaying) {
            this.btnPlay.classList.add('playing');
            this.iconPlay.classList.replace('fa-play', 'fa-stop');
        } else {
            this.btnPlay.classList.remove('playing');
            this.iconPlay.classList.replace('fa-stop', 'fa-play');

            if (this.onStopCallback) {
                this.onStopCallback();
            }
        }
    }
}

class NotePhaseManager {
    constructor() {
        this.btnMusic = document.getElementById('btn-music');
        this.iconMusic = document.getElementById('icon-music');
        this.musicPhase = 1;

        this.btnMusic.addEventListener('click', () => {
            this.musicPhase = (this.musicPhase % 3) + 1;

            this.btnMusic.classList.remove('phase-3');
            this.iconMusic.className = '';
            this.iconMusic.innerText = '';

            if (this.musicPhase === 1) {
                this.iconMusic.className = 'bi bi-music-note';
            } else if (this.musicPhase === 2) {
                this.iconMusic.className = 'bi bi-music-note-beamed';
            } else if (this.musicPhase === 3) {
                this.btnMusic.classList.add('phase-3');
                this.iconMusic.className = 'music-emoji';
                this.iconMusic.innerText = '🎶';
            }
        });
    }
}

class ChordManager {
    constructor(playbackManager, musicTheory) {
        this.playbackManager = playbackManager;
        this.musicTheory = musicTheory; // Dependência injetada
        this.chordBtns = document.querySelectorAll('.chord-btn');
        this.keySelect = document.getElementById('key-select');
        this.btnKeyDown = document.getElementById('btn-key-down');
        this.btnKeyUp = document.getElementById('btn-key-up');

        this.init();
    }

    init() {
        // 1. Popula dinamicamente as opções do Select (Tons)
        this.populateKeySelect();

        // 2. Preenche os botões de acordes pela primeira vez (Tom base = C, índice 0)
        this.transposeChords(0);

        this.playbackManager.onStop(() => this.clearActiveChords());

        this.chordBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleChordClick(btn));
        });

        this.keySelect.addEventListener('change', (e) => {
            this.transposeChords(parseInt(e.target.value, 10));
        });

        this.btnKeyDown.addEventListener('click', () => this.changeKeyStep(-1));
        this.btnKeyUp.addEventListener('click', () => this.changeKeyStep(1));
    }

    /**
     * Consome a classe MusicTheory para gerar o HTML das options de tonalidade
     */
    populateKeySelect() {
        if (!this.keySelect) return;

        this.keySelect.innerHTML = ''; // Limpa qualquer resíduo HTML

        this.musicTheory.notes.forEach((note, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = note;
            this.keySelect.appendChild(option);
        });

        // Define Dó (C) como tom inicial
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

            if (!this.playbackManager.isPlaying) {
                this.playbackManager.setPlayState(true);
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

            // Consumindo o método centralizado da classe MusicTheory
            const newNote = this.musicTheory.transposeNote(baseInterval, keyOffset);
            btn.innerText = `${newNote}${chordType}`;
        });
    }
}

class PianoManager {
    constructor(musicTheory) {
        this.musicTheory = musicTheory; // Dependência injetada
        this.container = document.getElementById('piano-container');
        this.shadowLeft = document.querySelector('.scroll-shadow-left');
        this.shadowRight = document.querySelector('.scroll-shadow-right');

        this.isDown = false;
        this.isDragging = false;
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

        // Consumindo o padrão gerado centralmente
        const pattern = this.musicTheory.getPianoPattern();

        octaves.forEach(octave => {
            pattern.forEach(n => {
                const key = document.createElement('div');
                key.className = `key ${n.type}`;
                key.innerHTML = `<span>${n.note}${octave}</span>`;
                piano.appendChild(key);
            });
        });

        // Adiciona a nota final C6 para fechar o teclado lindamente
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

        this.container.addEventListener('touchstart', (e) => {
            this.downAction(e.touches[0].pageX, e.target);
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            this.moveAction(e.touches[0].pageX);
        }, { passive: true });

        window.addEventListener('touchend', () => this.upAction());
    }

    downAction(pageX, target) {
        this.isDown = true;
        this.isDragging = false;

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
            this.isDragging = true;
            this.container.scrollLeft = this.scrollLeft - walk;

            if (this.activeKey) {
                this.activeKey.classList.remove('pressed');
            }
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

        if (currentScroll > 0) {
            this.shadowLeft.classList.remove('d-none');
        } else {
            this.shadowLeft.classList.add('d-none');
        }

        if (currentScroll < maxScroll - 1 && maxScroll > 0) {
            this.shadowRight.classList.remove('d-none');
        } else {
            this.shadowRight.classList.add('d-none');
        }
    }
}

/**
 * Gerencia a experiência em dispositivos móveis (Tela Cheia e Bloqueio de Suspensão/Wake Lock)
 */
class MobileExperienceManager {
    constructor() {
        this.wakeLock = null;
        this.shouldKeepAwake = false;
        this.isActivating = false;

        this.init();
    }

    init() {
        // Usando capture: true para garantir que o evento seja pego antes de qualquer biblioteca anular o clique
        ['click', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, () => this.enableMobileExperience(), { capture: true, passive: true });
        });

        // Restaura o Wake Lock se o usuário minimizar o navegador e voltar
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    isMobileDevice() {
        return window.innerWidth <= 768 && navigator.maxTouchPoints > 0;
    }

    async enableMobileExperience() {
        if (!this.isMobileDevice()) return;

        // Se já tem tela cheia e o bloqueio de tela ativos, ignora para não sobrecarregar
        if (document.fullscreenElement && this.wakeLock) return;

        // Impede de fazer requisições simultâneas enquanto uma já está carregando
        if (this.isActivating) return;
        this.isActivating = true;

        try {
            await this.requestFullscreen();
            await this.requestWakeLock();
        } finally {
            this.isActivating = false;
        }
    }

    async requestFullscreen() {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (error) {
                // Erros silenciosos, comum em iOS
            }
        }
    }

    async requestWakeLock() {
        if ('wakeLock' in navigator && !this.wakeLock) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.shouldKeepAwake = true;

                this.wakeLock.addEventListener('release', () => {
                    this.wakeLock = null;
                });
            } catch (error) {
                console.warn("Não foi possível ativar o bloqueio de tela:", error.message);
            }
        }
    }

    async handleVisibilityChange() {
        if (this.shouldKeepAwake && document.visibilityState === 'visible') {
            await this.requestWakeLock();
        }
    }
}

/**
 * Classe Central de Teoria Musical
 */
class MusicTheory {
    constructor() {
        // Escala unificada baseada na regra: somente C e F têm sustenidos (#), demais são bemóis (b)
        this.notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

        // Padrão estrutural de uma oitava no teclado (0 a 11)
        this.pianoPattern = [
            { index: 0, type: 'white' }, // C
            { index: 1, type: 'black' }, // C#
            { index: 2, type: 'white' }, // D
            { index: 3, type: 'black' }, // Eb (Antigo D#)
            { index: 4, type: 'white' }, // E
            { index: 5, type: 'white' }, // F
            { index: 6, type: 'black' }, // F#
            { index: 7, type: 'white' }, // G
            { index: 8, type: 'black' }, // Ab (Antigo G#)
            { index: 9, type: 'white' }, // A
            { index: 10, type: 'black' },// Bb (Antigo A#)
            { index: 11, type: 'white' } // B
        ];
    }

    /**
     * Retorna a nota correspondente a um índice, garantindo que o ciclo de 12 se repita.
     */
    getNoteByIndex(index) {
        const normalizedIndex = ((index % 12) + 12) % 12;
        return this.notes[normalizedIndex];
    }

    /**
     * Calcula a transposição a partir de um intervalo base e um deslocamento (keyOffset).
     */
    transposeNote(baseInterval, offset) {
        return this.getNoteByIndex(baseInterval + offset);
    }

    /**
     * Retorna o padrão visual de teclas de piano, já preenchido com as notas corretas.
     */
    getPianoPattern() {
        return this.pianoPattern.map(key => ({
            note: this.notes[key.index],
            type: key.type
        }));
    }
}

/**
 * Inicialização Principal (Injeção de Dependências)
 */
document.addEventListener('DOMContentLoaded', () => {

    const tomSelectInstance = new TomSelect("#song-select", {
        create: false,
        sortField: { field: "text", direction: "asc" },
        placeholder: "Escolha a Música...",
        allowEmptyOption: false
    });

    // Infraestrutura e Dados
    const dbManager = new DatabaseManager();
    const viewManager = new ViewManager();
    const themeManager = new ThemeManager();
    const languageManager = new LanguageManager(tomSelectInstance);
    const modalManager = new ModalManager(languageManager);
    const backupManager = new BackupManager(dbManager);
    const musicTheory = new MusicTheory();

    // Core Controllers (Lógica de Negócios Central)
    const repertoireController = new RepertoireController(tomSelectInstance, dbManager, viewManager, modalManager, backupManager);
    const liturgyManager = new LiturgyManager(tomSelectInstance, viewManager);

    // Component Controllers (Interface)
    const bpmManager = new BpmManager();
    const playbackManager = new PlaybackManager();
    const notePhaseManager = new NotePhaseManager();
    const chordManager = new ChordManager(playbackManager, musicTheory);
    const pianoManager = new PianoManager(musicTheory);

    // --> INICIALIZANDO O EDITOR DE PARTITURA <--
    const sheetMusicEditor = new SheetMusicEditor();

    // A MÁGICA DO CARREGAMENTO: Hidrata as partituras vazias transformando data-score em SVG visual
    viewManager.onHydrateScores = () => {
        const blocks = viewManager.mainDisplay.querySelectorAll('.sheet-music-block');
        blocks.forEach(block => {
            // Se a div está vazia (acabou de vir limpa do LocalStorage)
            if (block.innerHTML.trim() === '') {
                const data = ScoreCodec.decode(block.dataset.score);
                const svg = sheetMusicEditor.generateSvgFromData(data);
                if (svg) block.appendChild(svg);
            }
        });
    };

    // Evento do botão Flutuante "🎼" para adicionar nova partitura
    if (viewManager.btnAddSheetMusic) {
        viewManager.btnAddSheetMusic.addEventListener('click', (e) => {
            e.preventDefault();

            sheetMusicEditor.open(null, null, (svgElement, currentData, existingBlock) => {
                insertSheetMusicBlock(svgElement, currentData, existingBlock);
            });
        });
    }

    // Evento de Clique no Main Display para EDITAR uma partitura
    viewManager.mainDisplay.addEventListener('click', (e) => {
        if (viewManager.mainDisplay.getAttribute('contenteditable') === 'true') {
            const block = e.target.closest('.sheet-music-block');
            if (block) {
                // A MÁGICA AQUI: Decodificando a string limpa para o VexFlow
                const data = ScoreCodec.decode(block.dataset.score);
                sheetMusicEditor.open(data, block, (svgElement, currentData, existingBlock) => {
                    insertSheetMusicBlock(svgElement, currentData, existingBlock);
                });
            }
        }
    });

    function insertSheetMusicBlock(svgElement, data, existingBlock) {
        // A MÁGICA AQUI 2: Codificando os dados para salvar limpo no HTML
        const compactString = ScoreCodec.encode(data);

        if (existingBlock) {
            existingBlock.dataset.score = compactString;
            existingBlock.innerHTML = '';
            existingBlock.appendChild(svgElement);
            return;
        }

        const block = document.createElement('div');
        block.className = 'sheet-music-block';
        block.contentEditable = 'false';
        block.dataset.score = compactString; // Salva super limpo
        block.appendChild(svgElement);

        viewManager.mainDisplay.focus();

        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (viewManager.mainDisplay.contains(range.commonAncestorContainer)) {
                range.collapse(false);
                range.insertNode(block);

                const spaceNode = document.createTextNode('\u200B');
                range.setStartAfter(block);
                range.insertNode(spaceNode);
                range.setStartAfter(spaceNode);
                range.collapse(true);

                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
        }

        viewManager.mainDisplay.appendChild(block);
        viewManager.mainDisplay.appendChild(document.createTextNode('\u200B'));
    }
});