class App {
    constructor(elements) {
        this.elements = elements;
        this.currentInstrumentMode = 'orgao';
        this.BASE_URL = location.origin.includes('file:') ? 'https://roneicostasoares.com.br/orgao.web.beta' : '.';

        this.musicTheory = new MusicTheory();
        this.uiController = new UIController(this.elements);
        this.localStorageManager = new LocalStorageManager();

        // 1. Criar o gerenciador de áudio ÚNICO aqui
        this.audioManager = new AudioContextManager();
        this.audioManager.tonePiano = new TonePianoManager(this.audioManager);

        // NOVO: Adiciona o Sintetizador de Piano
        this.pianoSynthesizer = new PianoSynthesizer(this.audioManager.audioContext);

        // 2. Passar o audioManager para todos os players
        this.partituraEditor = new PartituraEditor(this.elements.partituraEditFrame, this.elements.partituraFrame, this.musicTheory);

        this.cifraPlayer = new CifraPlayer(this.elements, this.uiController, this.musicTheory, this.BASE_URL, this.audioManager);

        // Após inicializar o this.audioManager, defina o volume mestre pegando do HTML:
        const volumeInput = document.getElementById('volumeMaster');
        const initialVol = volumeInput ? parseFloat(volumeInput.value) : 1.0;
        this.audioManager.masterGain.gain.value = initialVol;

        this.cifraPlayer.onInstrumentosCarregados = () => {
            this.elements.orgaoInstrumentButton.removeAttribute('disabled');
        };

        // PartituraPlayer agora recebe o audioManager pronto
        this.partituraPlayer = new PartituraPlayer(this.elements, this.cifraPlayer, this.partituraEditor, this.BASE_URL, this.audioManager);

        this.draggableController = new DraggableController(this.elements.draggableControls);

        // Em App.init(), após criar o partituraPlayer:
        this.partituraPlayer.onNotaClicada = () => {
            this.uiController.exibirBotaoStop();
            this.uiController.exibirBotoesAvancarVoltarCifra();
        };

        this.versionConfig = {
            version: '6.1.1',
            htmlMessage: `
                <p>Melhorias</p>

                <p>• Correção do áudio alto e estourando.</p>
            `
        };
        this.holdTime = 1000;
        this.held = false;
        this.pesquisarNaWeb = false;
        this.editing = false;
        this.timer = null;
        this.todasAsCifras = [];
        this.musicaEscolhida = false;
        this.selectItemAntes = null;
        this.LOCAL_STORAGE_SAVES_KEY = 'saves';
        this.LOCAL_STORAGE_ACORDES_KEY = 'savesAcordes';
        this.API_BASE_URL = 'https://apinode-h4wt.onrender.com';
        this.STYLES_LOCAL_KEY = 'drumStylesData';
        this.VERSION_LOCAL_KEY = 'versao_app';
        this.LOG_STORAGE_KEY = 'debug_logs_v1';
    }

    async init() {
        this.showVersionAlert();
        this.setupServiceWorker();
        this.loadCifrasLocal();
        //this.warmupApi();
        this.setupDarkMode();
        this.migrateLocalStorageSaves();
        this.uiController.exibirListaSaves();
        this.uiController.injetarEstilosNoIframeCifra();

        this.bindEvents();
        this.setupSelect2();
        this.getUrlParam();
        this.updateFillBlink(this.musicTheory.bpm);

        // --- ADICIONE ESTA LINHA AQUI ---
        this.partituraPlayer.init();

        this.drumMachine = new DrumMachine(this.BASE_URL, this.cifraPlayer, this.musicTheory, this.audioManager);
        this.bateriaUI = new BateriaUI(this.elements, this.drumMachine, this.uiController, this.cifraPlayer);

        this.melodyMachine = new MelodyMachine(this.BASE_URL, this.musicTheory, this.cifraPlayer, this.audioManager);
        await this.melodyMachine.init();

        this.melodyUI = new MelodyUI(this.elements, this.melodyMachine, this.uiController);
        await this.melodyUI.init();

        this.cifraPlayer.onChordChange = () => {
            if ((this.currentInstrumentMode === 'orgao' || this.currentInstrumentMode === 'piano') && this.elements.melodyStyleSelect.value !== '') {
                this.melodyUI.play();
            }
        };

        //if (this.BASE_URL.includes('http')) {
        //    document.getElementById('downloadStylesLink').parentElement.classList.remove('d-none');
        //    document.getElementById('styleButtons').classList.remove('d-none');
        //    document.getElementById('drumEditor').classList.remove('d-none');
        //    document.getElementById('melodyTracks').classList.remove('d-none');
        //    document.getElementById('stepsMelody').classList.remove('d-none');
        //    document.getElementById('melodySaveControl').classList.remove('d-none');
        //    document.getElementById('save-melody').classList.remove('d-none');
        //}
    }

    // ATENÇÃO: COPIE APENAS OS MÉTODOS BINDEvents e handlePianoKeyClick do APP.JS

    bindEvents() {
        this.elements.santamissaFrame.addEventListener('load', this.handleSantaMissaLoad.bind(this));
        this.elements.selectedButton.addEventListener("click", this.handleSelectedButtonClick.bind(this));
        this.elements.cancelButton.addEventListener("click", this.handleCancelClick.bind(this));
        this.elements.saveButton.addEventListener('click', this.handleSaveClick.bind(this));
        this.elements.darkModeToggle.addEventListener('change', this.uiController.toggleDarkMode.bind(this.uiController));
        this.elements.tocarButton.addEventListener('click', this.handleTocarClick.bind(this));
        this.elements.tomSelect.addEventListener('change', this.handleTomSelectChange.bind(this));
        this.elements.decreaseTom.addEventListener('click', this.handleDecreaseTomClick.bind(this));
        this.elements.increaseTom.addEventListener('click', this.handleIncreaseTomClick.bind(this));
        this.elements.addButton.addEventListener('click', this.handleAddClick.bind(this));
        this.elements.editSavesSelect.addEventListener('click', this.handleEditSaveClick.bind(this));
        this.elements.deleteSavesSelect.addEventListener('click', this.handleDeleteSaveClick.bind(this));
        this.elements.searchInput.addEventListener('keydown', this.handleSearchInputKeydown.bind(this));
        this.elements.itemNameInput.addEventListener('keydown', this.handleItemNameInputKeydown.bind(this));
        this.elements.searchButton.addEventListener('click', this.searchMusic.bind(this));
        this.elements.clearButton.addEventListener('click', () => this.handleClearSearchClick());
        this.elements.liturgiaDiariaLink.addEventListener('click', () => this.exibirFrame('liturgiaDiariaFrame'));
        this.elements.oracoesLink.addEventListener('click', () => this.exibirFrame('oracoesFrame'));
        this.elements.aboutLink.addEventListener('click', () => this.exibirSobre());
        this.elements.downloadSavesLink.addEventListener('click', this.downloadSaves.bind(this));
        this.elements.uploadSavesLink.addEventListener('click', this.uploadSaves.bind(this));
        this.elements.restoreLink.addEventListener('click', this.restore.bind(this));
        this.elements.downloadStylesLink.addEventListener('click', () => this.downloadStyles());
        this.elements.missaOrdinarioLink.addEventListener('click', () => this.exibirFrame('santamissaFrame'));
        this.elements.stopButton.addEventListener('mousedown', this.handleStopMousedown.bind(this));
        this.elements.playButton.addEventListener('mousedown', this.handlePlayMousedown.bind(this));
        this.elements.avancarButton.addEventListener('mousedown', () => this.avancar());
        this.elements.retrocederButton.addEventListener('mousedown', () => this.retroceder());
        this.elements.orgaoInstrumentButton.addEventListener('click', () => this.openInstrumentModal());
        this.elements.bateriaInstrumentButton.addEventListener('click', () => this.openInstrumentModal());
        document.addEventListener('mousedown', this.fullScreen.bind(this));
        document.addEventListener('click', this.handleDocumentClick.bind(this));
        $('#searchModal').on('shown.bs.modal', this.handleSearchModalShown.bind(this));

        document.getElementById('increment-bpm-5').addEventListener('click', () => {
            this.elements.bpmInput.value = (parseInt(this.elements.bpmInput.value, 10) || 0) + 5;
            this.setBPM(parseInt(this.elements.bpmInput.value, 10));
        });

        ['mousedown', 'touchstart'].forEach(evento => {
            this.elements.tomSelect.addEventListener(evento, () => {
                this.tomAnterior = this.elements.tomSelect.value;
            });
            this.elements.decreaseTom.addEventListener(evento, () => {
                this.tomAnterior = this.elements.tomSelect.value;
            });
            this.elements.increaseTom.addEventListener(evento, () => {
                this.tomAnterior = this.elements.tomSelect.value;
            });
        });

        document.getElementById('decrement-bpm').addEventListener('click', () => {
            this.elements.bpmInput.value = (parseInt(this.elements.bpmInput.value, 10) || 0) - 1;
            this.setBPM(parseInt(this.elements.bpmInput.value, 10));
        });
        document.getElementById('decrement-bpm-5').addEventListener('click', () => {
            const bpm = Math.max(1, (parseInt(this.elements.bpmInput.value, 10) || 1) - 5);
            this.elements.bpmInput.value = bpm;
            this.setBPM(bpm);
        });

        this.elements.bpmInput.addEventListener('change', () => {
            const bpm = Math.max(1, parseInt(this.elements.bpmInput.value, 10) || 1);
            this.elements.bpmInput.value = bpm;
            this.setBPM(bpm);
        });

        document.getElementById('volumeMaster').addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);

            // Altera o volume global na mesma hora de forma suave (sem estalos)
            this.audioManager.masterGain.gain.setTargetAtTime(vol, this.audioManager.audioContext.currentTime, 0.05);
        });

        ['mousedown'].forEach(event => {
            const controlButtons = [
                this.elements.playButton,
                this.elements.notesButton,
                this.elements.stopButton,
                ...document.querySelectorAll('button[data-action="acorde"]')
            ];
            controlButtons.forEach(button => {
                button.addEventListener(event, this.togglePressedState.bind(this));
            });
        });

        // ==========================================
        // EVENTOS DO TECLADO DE PIANO (Com "Arrastar", "Sustain" e "Filtro de Toque Rápido")
        // ==========================================
        const pianoWrapper = this.elements.pianoWrapper;
        let isDraggingPiano = false;

        const handlePianoInput = (e) => {
            let x, y;
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX;
                y = e.touches[0].clientY;
            } else {
                x = e.clientX;
                y = e.clientY;
            }

            const elem = document.elementFromPoint(x, y);
            const isKey = elem && elem.classList.contains('piano-key');

            if (isKey) {
                const pitch = elem.dataset.pitch;
                if (pitch && elem !== this._lastPlayedPianoKey) {

                    // CORREÇÃO: Se escorregou muito rápido antes de dar o tempo, cancela a nota!
                    if (this._pianoKeyTimeout) {
                        clearTimeout(this._pianoKeyTimeout);
                        this._pianoKeyTimeout = null;
                    }

                    // Se mudou para uma tecla nova (após tempo da anterior), solta a que já estava tocando
                    if (this._lastPlayedPianoKey) {
                        this.releasePianoKey(this._lastPlayedPianoKey);
                    }

                    this._lastPlayedPianoKey = elem;

                    // CORREÇÃO: Aguarda 70ms antes de confirmar o toque. 
                    // Se você soltar ou arrastar antes disso, o som é ignorado.
                    this._pianoKeyTimeout = setTimeout(() => {
                        this.pressPianoKey(pitch, elem);
                        this._pianoKeyTimeout = null;
                    }, 70);
                }
            } else {
                // Se arrastou o dedo para FORA do teclado...
                // 1. Cancela se estava prestes a tocar (esbarrão)
                if (this._pianoKeyTimeout) {
                    clearTimeout(this._pianoKeyTimeout);
                    this._pianoKeyTimeout = null;
                }
                // 2. Solta a nota se já estivesse tocando
                if (this._lastPlayedPianoKey) {
                    this.releasePianoKey(this._lastPlayedPianoKey);
                    this._lastPlayedPianoKey = null;
                }
            }
        };

        // Mouse Events
        pianoWrapper.addEventListener('mousedown', (e) => {
            isDraggingPiano = true;
            this._lastPlayedPianoKey = null;
            handlePianoInput(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingPiano) handlePianoInput(e);
        });

        window.addEventListener('mouseup', () => {
            isDraggingPiano = false;
            // Cancela se soltou rápido demais
            if (this._pianoKeyTimeout) {
                clearTimeout(this._pianoKeyTimeout);
                this._pianoKeyTimeout = null;
            }
            if (this._lastPlayedPianoKey) {
                this.releasePianoKey(this._lastPlayedPianoKey);
                this._lastPlayedPianoKey = null;
            }
        });

        // Touch Events (Celular/Tablet)
        pianoWrapper.addEventListener('touchstart', (e) => {
            isDraggingPiano = true;
            this._lastPlayedPianoKey = null;
            handlePianoInput(e);
        }, { passive: true });

        pianoWrapper.addEventListener('touchmove', (e) => {
            if (isDraggingPiano) {
                handlePianoInput(e);
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            isDraggingPiano = false;
            // Cancela se soltou rápido demais
            if (this._pianoKeyTimeout) {
                clearTimeout(this._pianoKeyTimeout);
                this._pianoKeyTimeout = null;
            }
            if (this._lastPlayedPianoKey) {
                this.releasePianoKey(this._lastPlayedPianoKey);
                this._lastPlayedPianoKey = null;
            }
        });
    }

    pressPianoKey(pitch, keyElement) {
        if (!pitch) return;

        // Limpa visualmente outras teclas
        document.querySelectorAll('.piano-key').forEach(key => {
            key.classList.remove('active-key');
        });

        // Efeito visual de tecla abaixada (FICA ABAIXADA ATÉ SOLTAR)
        keyElement.classList.add('active-key');

        // CORREÇÃO: Dispara o som dos samples OGG da flauta
        this.partituraPlayer.startPianoNote(pitch);

        // Aplica na partitura (se estiver editando)
        if (this.currentEditorType === 'partitura' && !this.elements.partituraEditFrame.classList.contains('d-none')) {
            this.partituraEditor.applyPianoNote(pitch);
        }
    }

    releasePianoKey(keyElement) {
        // Levanta a tecla visualmente
        if (keyElement) {
            keyElement.classList.remove('active-key');
        }

        // CORREÇÃO: Manda o som da flauta OGG morrer suavemente
        this.partituraPlayer.stopPianoNote();
    }

    setupSelect2() {
        const appInstance = this;

        var $select = $('#savesSelect').select2({
            theme: 'bootstrap4',
            placeholder: "Escolha a Música...",
            width: '100%',
            minimumResultsForSearch: 0,
            escapeMarkup: function (markup) { return markup; },
            language: {
                noResults: function () {
                    return `<li class="select2-results__option pesquisar-na-web" style="cursor:pointer">🔍 Pesquisar na Web</li>`;
                }
            }
        });

        $(document).on('click', '.pesquisar-na-web', function () {
            const searchTerm = $('.select2-search__field').val();
            $('#savesSelect').select2('close');
            appInstance.pesquisarWeb(searchTerm);
        });

        $(document).on('keydown', '.select2-search__field', function (e) {
            const enter = 13;
            if (e.which === enter) {
                const searchTerm = $(this).val();
                const pesquisarWebVisible = $('.pesquisar-na-web').length > 0;

                if (pesquisarWebVisible) {
                    e.preventDefault();
                    $('#savesSelect').select2('close');
                    appInstance.pesquisarWeb(searchTerm);
                }
            }
        });

        $('#savesSelect').on('select2:select', async (e) => {
            var selectedValue = e.params.data.id;
            await appInstance.selectEscolhido(selectedValue);

            if (selectedValue === 'acordes__') {
                $(this).val(null).trigger('change');
            }
        });
    }

    async exibirSobre() {
        const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');

        const logsHtml = logs.length > 0
            ? logs.reverse().join('<br><hr style="margin:2px 0;">')
            : '<em>Nenhum log registrado ainda.</em>';

        const htmlMessage = `
        <p><strong>Versão:</strong> ${this.versionConfig.version}</p>
        <p>Projeto de Ronei Costa Soares.</p>
        <div class="mt-3">
            <button class="btn btn-sm btn-danger mb-2" onclick="localStorage.removeItem('${LOG_STORAGE_KEY}'); this.nextElementSibling.innerHTML='Logs limpos!';">
                <i class="bi bi-trash"></i> Limpar Logs
            </button>
            <div style="
                max-height: 300px; 
                overflow-y: auto; 
                background: #f8f9fa; 
                border: 1px solid #dee2e6; 
                padding: 10px; 
                font-family: monospace; 
                font-size: 11px; 
                text-align: left;
                color: #333;">
                ${logsHtml}
            </div>
        </div>
    `;

        await this.uiController.customAlert(htmlMessage, 'Sobre / Logs de Debug');
    }

    showVersionAlert() {
        const lastSeenVersion = localStorage.getItem(this.VERSION_LOCAL_KEY) || '0.0.0';

        if (lastSeenVersion !== this.versionConfig.version) {
            this.uiController.versionAlert(this.versionConfig);
            localStorage.setItem(this.VERSION_LOCAL_KEY, this.versionConfig.version);
        }
    }

    setBPM(bpm) {
        this.musicTheory.bpm = bpm;
        this.updateFillBlink(bpm);
    }

    avancar() {
        if (!this.elements.partituraFrame.classList.contains('d-none')) {
            this._moverPartitura(1);
        } else {
            this._moverCifra(1);
        }
    }

    retroceder() {
        if (!this.elements.partituraFrame.classList.contains('d-none')) {
            this._moverPartitura(-1);
        } else {
            this._moverCifra(-1);
        }
    }

    _moverPartitura(direcao) {
        const total = this.partituraEditor.currentData.length - 1;
        const atual = this.partituraEditor.highlightIndex === -1 ? 0 : this.partituraEditor.highlightIndex;

        let novoIndex = atual + direcao;

        // CORREÇÃO: Fazer o loop (se passar do limite, volta pro início, se voltar do zero, vai pro final)
        if (novoIndex > total) {
            novoIndex = 0;
        } else if (novoIndex < 0) {
            novoIndex = total;
        }

        this.partituraEditor.highlightIndex = novoIndex;

        if (this.partituraPlayer.partituraPlaybackIndex !== -1) {
            // Está tocando: toca a nota
            this.partituraPlayer.partituraPlaybackIndex = novoIndex;
            this.partituraPlayer.tocarNotaAtualPartitura();
        } else {
            // Parado: só destaca
            this.partituraEditor.draw(this.elements.partituraFrame, false);
        }
    }

    _moverCifra(direcao) {
        // Garante que elements_b está inicializado
        if (!this.cifraPlayer.elements_b) {
            this.cifraPlayer.elements_b = this.elements.iframeCifra
                .contentDocument.getElementsByTagName('b');
        }

        if (!this.cifraPlayer.parado) {
            // Está tocando: usa o fluxo normal com som
            if (direcao > 0) {
                this.cifraPlayer.avancarCifra();
            } else {
                this.cifraPlayer.retrocederCifra();
            }
        } else {
            // Parado: só destaca sem som
            if (direcao > 0) {
                this.cifraPlayer.avancarDestaque();
            } else {
                this.cifraPlayer.retrocederDestaque();
            }
        }
    }

    updateFillBlink(bpm) {
        const secPerBeat = 60 / bpm;
        document.documentElement.style.setProperty('--fill-blink-duration', `${secPerBeat}s`);
    }

    handleSantaMissaLoad() {
        window.addEventListener('message', (event) => {
            if (event.data === 'mostrarLiturgiaDiaria') {
                this.elements.liturgiaDiariaFrame.classList.remove('d-none');
                this.elements.santamissaFrame.classList.add('d-none');
                this.elements.oracoesFrame.classList.add('d-none');
            }
        });
    }

    handleSelectedButtonClick() {
        this.uiController.exibirSavesSelect();
        this.selectEscolhido(this.elements.selectedButton.innerText);
    }

    async handleCancelClick() {
        const confirmed = await this.uiController.customConfirm('Cancelar edição?');
        if (confirmed) {
            this.uiController.resetInterface();
            this.selectEscolhido(this.elements.itemNameInput.value);
        }
    }

    async handleSaveClick() {
        let saveName = this.elements.itemNameInput.value;

        if (this.editing) {
            this.editing = false;
            const confirmed = await this.uiController.customConfirm(`Salvar "${saveName}"?`);
            if (confirmed) {
                this.salvarSave(saveName, this.elements.savesSelect.value);
            } else {
                this.editing = true;
            }
        }
        else {
            this.salvarSave(saveName);
        }
    }

    handleTocarClick() {
        this.showLetraCifra(this.elements.cifraDisplay.textContent);
        $('#searchModal').modal('hide');
    }

    getIframeStorageName() {
        let localStorageSalvar = 'acordes';
        if (!this.elements.liturgiaDiariaFrame.classList.contains('d-none')) {
            localStorageSalvar = 'liturgiaDiariaFrame';
        } else if (!this.elements.santamissaFrame.classList.contains('d-none')) {
            localStorageSalvar = 'santamissaFrame';
        } else if (!this.elements.oracoesFrame.classList.contains('d-none')) {
            localStorageSalvar = 'oracoesFrame';
        }
        return localStorageSalvar;
    }

    handleTomSelectChange(event) {
        const selectedTom = this.elements.tomSelect.value;

        // Se o tom selecionado for nulo/vazio (Selecionou "Letra")
        if (!selectedTom) {
            this.cifraPlayer.removeCifras(this.elements.iframeCifra.contentDocument.body.innerHTML);
            this.uiController.exibirBotoesAcordes();
            this.cifraPlayer.preencherSelectAcordes('C');
            return;
        }

        // -------------------------------------------------------------
        // CENÁRIO 1: MODO PARTITURA (EDIÇÃO OU VISUALIZAÇÃO)
        // -------------------------------------------------------------

        // 1.1: Editando Partitura
        if (!this.elements.partituraEditFrame.classList.contains('d-none')) {
            this.cifraPlayer.preencherAcordes(selectedTom); // Atualiza os botões de atalho
            this.partituraEditor.draw(this.elements.partituraEditFrame, true); // Redesenha pauta
            return;
        }

        // 1.2: Visualizando Partitura
        if (!this.elements.partituraFrame.classList.contains('d-none')) {
            const tomOrigem = this.tomAnterior || selectedTom;
            const semitones = this.musicTheory.getTransposeSteps(tomOrigem, selectedTom);
            this.tomAnterior = selectedTom;
            this.partituraEditor.transporVisualizacao(semitones);
            return;
        }

        // -------------------------------------------------------------
        // CENÁRIO 2: MODO SOLO DE ACORDES / AUXILIARES DE MISSA
        // (Selecionou "Acordes", ou está lendo Liturgia/Missa/Orações)
        // -------------------------------------------------------------
        const noSoloDeAcordes = !this.elements.savesSelect.value || this.elements.savesSelect.value === 'acordes__';
        const lendoTextosMissa = !this.elements.liturgiaDiariaFrame.classList.contains('d-none') ||
            !this.elements.santamissaFrame.classList.contains('d-none') ||
            !this.elements.oracoesFrame.classList.contains('d-none');

        if (noSoloDeAcordes || lendoTextosMissa) {
            // Salva as configurações de metadados para lembrar o tom daquela tela específica
            const localStorageSalvar = this.getIframeStorageName();
            this.salvarMetaDataNoLocalStorage(this.LOCAL_STORAGE_ACORDES_KEY, localStorageSalvar);

            // Atualiza os botões de acordes na tela
            this.cifraPlayer.preencherAcordes(selectedTom);
            return;
        }

        // -------------------------------------------------------------
        // CENÁRIO 3: MODO CIFRA (Música cifrada carregada no iframe)
        // -------------------------------------------------------------
        if (!this.elements.iframeCifra.classList.contains('d-none')) {
            this.cifraPlayer.transposeCifra();

            if (!this.cifraPlayer.parado && this.cifraPlayer.acordeTocando) {
                const button = event.currentTarget;
                this.cifraPlayer.parado = false;
                this.cifraPlayer.tocarAcorde(button.value);
                button.classList.add('pressed');
            }
        }
    }

    handleDecreaseTomClick() {
        if (this.elements.tomSelect.value) {
            const acordeIndex_B = this.elements.tomSelect.innerHTML.includes('Letra') ? 13 : 12;
            const acordeIndex_C = this.elements.tomSelect.innerHTML.includes('Letra') ? 1 : 0;

            let tomIndex = parseInt(this.elements.tomSelect.selectedIndex);
            if (tomIndex === acordeIndex_C)
                tomIndex = acordeIndex_B;
            this.elements.tomSelect.value = this.elements.tomSelect.options[tomIndex - 1].value;
            this.elements.tomSelect.dispatchEvent(new Event('change'));
        }
    }

    handleIncreaseTomClick() {
        if (this.elements.tomSelect.value) {
            const acordeIndex_B = this.elements.tomSelect.innerHTML.includes('Letra') ? 12 : 11;
            const acordeIndex_C = this.elements.tomSelect.innerHTML.includes('Letra') ? 0 : -1;

            let tomIndex = parseInt(this.elements.tomSelect.selectedIndex);
            if (tomIndex === acordeIndex_B)
                tomIndex = acordeIndex_C;
            this.elements.tomSelect.value = this.elements.tomSelect.options[tomIndex + 1].value;
            this.elements.tomSelect.dispatchEvent(new Event('change'));
        }
    }

    async handleAddClick() {
        this.elements.addButton.classList.add('pressed');
        setTimeout(() => this.elements.addButton.classList.remove('pressed'), 100);

        // Se o menu lateral (lápis/lixeira) estiver aberto
        if (!this.elements.deleteSavesSelect.classList.contains('d-none')) {
            const tipo = await this.uiController.chooseEditorType();
            this.currentEditorType = tipo;

            this.elements.itemNameInput.value = '';
            $('#savesSelect').val('').trigger('change');

            // 1. Entra no modo de edição (isso esconde os botões de editar/excluir)
            this.uiController.editarMusica(tipo);

            if (tipo === 'partitura') {
                if (!this.partituraPlayer._initialized) await this.partituraPlayer.init();
                this.partituraEditor.abrirEditor([]);
            } else {
                this.elements.editTextarea.value = '';
            }

            this.uiController.exibirBotoesTom();
            this.uiController.exibirBotoesAcordes();
            this.cifraPlayer.preencherSelectCifras('C');
            this.elements.itemNameInput.focus();

            // CORREÇÃO: Não chamamos toggleEditDeleteButtons aqui se entramos no editor, 
            // pois o editarMusica já limpou a interface corretamente.
            return;
        }

        this.uiController.toggleEditDeleteButtons();
    }

    async handleEditSaveClick() {
        const saveName = this.elements.savesSelect.value;
        if (!saveName) return;

        const saveData = this.localStorageManager.getSaveJson(this.LOCAL_STORAGE_SAVES_KEY, saveName);
        const tipo = saveData.type || (saveData.chords?.includes('@') ? 'partitura' : 'cifra');
        this.currentEditorType = tipo;

        this.editing = true;
        this.elements.itemNameInput.value = saveName;

        this.uiController.editarMusica(tipo);

        if (tipo === 'partitura') {
            if (!this.partituraPlayer._initialized) await this.partituraPlayer.init();
            const dataArray = saveData.chords.split('\n').filter(l => l.trim());
            this.partituraEditor.abrirEditor(dataArray);
        } else {
            // Pega o texto transposto do iframe em vez do original do localStorage
            const iframeBody = this.elements.iframeCifra.contentDocument?.body;
            const textoTransposto = iframeBody
                ? this.cifraPlayer.removerTagsDaCifra('<pre>' + iframeBody.innerText + '</pre>')
                : saveData.chords || "";

            // Se o tom foi alterado, usa o texto do iframe; senão usa o salvo
            const tomAtual = this.elements.tomSelect.value;
            const tomOriginal = saveData.key || 'C';

            this.elements.editTextarea.value = (tomAtual !== tomOriginal)
                ? (iframeBody?.innerText || saveData.chords || "")
                : (saveData.chords || "");
        }

        this.uiController.exibirBotoesTom();
        this.uiController.exibirBotoesAcordes();
        this.cifraPlayer.preencherSelectCifras(this.elements.tomSelect.value ?? 'C');
        this.uiController.exibirInstrumento(this.currentInstrumentMode);
    }

    async handleDeleteSaveClick() {
        const saveName = this.elements.savesSelect.value;
        if (this.elements.savesSelect.selectedIndex !== 0) {
            const confirmed = await this.uiController.customConfirm(`Deseja excluir "${saveName}"?`, 'Deletar!');
            if (confirmed) {
                this.localStorageManager.deleteJson(this.LOCAL_STORAGE_SAVES_KEY, saveName);
                this.uiController.resetInterface();
                this.uiController.exibirListaSaves();
                this.selectEscolhido('acordes__');
            }
        }
    }

    handleSearchInputKeydown(event) {
        if (event.key === 'Enter') {
            this.searchMusic();
        }
    }

    handleItemNameInputKeydown(event) {
        if (event.key === 'Enter') {
            this.elements.saveButton.click(); // Simula o clique no botão Salvar
        }
    }

    handleClearSearchClick() {
        this.elements.searchInput.value = '';
        this.elements.searchInput.focus();
    }

    handleStopMousedown() {
        this.uiController.esconderEditDeleteButtons();

        this.partituraPlayer.partituraPlaybackIndex = -1;
        this.audioManager.stopAll(this.partituraPlayer.activeSources, 0.02);

        this.uiController.habilitarSelectSaves(); // Reabilita opções e edições ao parar partitura

        this.cifraPlayer.pararReproducao();
        this.bateriaUI.stop();
        if (this.elements.melodyStyleSelect.value) {
            this.melodyUI.stop();
        }
    }

    handlePlayMousedown() {
        if (this.currentEditorType === 'partitura' || (!this.elements.partituraFrame.classList.contains('d-none'))) {
            const startIndex = this.partituraEditor.highlightIndex !== -1
                ? this.partituraEditor.highlightIndex
                : 0;

            this.partituraPlayer.partituraPlaybackIndex = startIndex;
            this.partituraPlayer.tocarNotaAtualPartitura();
            this.uiController.exibirBotaoStop();
            this.uiController.exibirBotoesAvancarVoltarCifra();

            this.uiController.desabilitarSelectSaves(); // Trava select e botão de mais (+/lápis) ao tocar
        }
        else if (this.elements.acorde1.classList.contains('d-none')) {
            // Modo cifra — começa do índice atual se houver destaque
            if (this.cifraPlayer.indiceAcorde > 0) {
                // Já há uma posição selecionada, retrocede um para retocar a atual
                this.cifraPlayer.indiceAcorde--;
            }
            this.cifraPlayer.iniciarReproducao();
        } else {
            this.bateriaUI.play();
        }
    }

    handleDocumentClick(event) {
        if (!this.elements.addButton.contains(event.target) &&
            !this.elements.deleteSavesSelect.contains(event.target) &&
            !this.elements.editSavesSelect.contains(event.target) &&
            !this.elements.savesSelect.contains(event.target)
        ) {
            this.uiController.esconderEditDeleteButtons();
        }
    }

    handleSearchModalShown() {
        if (this.elements.savesSelect.value !== '')
            this.elements.searchModalLabel.textContent = this.elements.savesSelect.value;

        if (this.pesquisarNaWeb) {
            this.pesquisarNaWeb = false;
            this.uiController.exibirInterfaceDePesquisaPesquisando();
        }
    }

    async changeInstrumentMode(mode) {
        this.uiController.bloquearInstrumentos();

        try {
            this.currentInstrumentMode = mode;

            if (mode === 'orgao') {
                this.cifraPlayer.instrumento = 'orgao';
                this.cifraPlayer.attack = 0.2;
                this.cifraPlayer.atualizarVolumeStringsParaOrgao();
                await this.melodyMachine.setInstrument('orgao');
                this.partituraPlayer.setInstrument('flauta'); // Partitura volta pro padrão
                this.uiController.exibirInstrumento(mode);
            }
            else if (mode === 'piano') {
                // AQUI: Agora usamos o piano acústico real
                this.cifraPlayer.instrumento = 'piano';
                await this.cifraPlayer.loadPianoSounds();
                this.cifraPlayer.attack = 0.05;
                this.cifraPlayer.atualizarVolumeStringsParaOrgao();

                await this.melodyMachine.setInstrument('piano');
                this.partituraPlayer.setInstrument('piano');

                this.uiController.exibirInstrumento(mode);
            }
            else if (mode === 'bateria') {
                this.cifraPlayer.instrumento = 'epiano';
                await this.cifraPlayer.loadEpianoSounds();
                this.cifraPlayer.attack = 0;
                this.cifraPlayer.atualizarVolumeStringsParaEpiano();
                if (!this.bateriaUI._initialized) {
                    await this.drumMachine.init();
                    await this.bateriaUI.init();
                    this.bateriaUI._initialized = true;
                }
                this.uiController.exibirInstrumento(mode);
            }

            if (!this.elements.savesSelect.value || this.elements.savesSelect.value === 'acordes__') {
                const localStorageSalvar = this.getIframeStorageName();
                this.salvarMetaDataNoLocalStorage(this.LOCAL_STORAGE_ACORDES_KEY, localStorageSalvar);
            }
        } catch (error) {
            console.error("Erro ao trocar de instrumento:", error);
        } finally {
            this.uiController.desbloquearInstrumentos();
        }
    }

    openInstrumentModal() {
        const modalBody = document.getElementById('instrumentSelectionBody');
        if (!modalBody) return;
        modalBody.innerHTML = '';

        const instruments = [
            { id: 'orgao', label: '🎶 Órgão' },
            { id: 'piano', label: '🎹 Piano' },
            { id: 'bateria', label: '🥁 Bateria' }
        ];

        // Injeta apenas os botões que não estão ativos
        instruments.forEach(inst => {
            if (inst.id !== this.currentInstrumentMode) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-outline-primary btn-block py-3 mb-2 font-weight-bold';
                btn.innerHTML = inst.label;
                btn.onclick = () => {
                    $('#instrumentSelectionModal').modal('hide');
                    this.changeInstrumentMode(inst.id);
                };
                modalBody.appendChild(btn);
            }
        });

        $('#instrumentSelectionModal').modal('show');
    }

    verifyLetraOuCifra(texto, saveData) {
        if (texto.includes('<pre class="cifra">')) {
            this.elements.bpmContainer.classList.remove('d-none');
            this.elements.draggableControls.classList.remove('d-none');
            this.elements.instrumentsWrapper.classList.remove('d-none');
            this.elements.pianoWrapper.classList.remove('d-none');
            this.elements.bottomSpacer.classList.add('d-none');

            let tom = 'C';
            if (saveData && saveData.key && saveData.key !== '') {
                tom = saveData.key;
            } else {
                tom = this.cifraPlayer.descobrirTom(texto);
            }
            const musicaCifrada = this.cifraPlayer.destacarCifras(texto, tom);
            this.cifraPlayer.preencherSelectCifras(tom);
            this.uiController.exibirBotoesCifras();
            this.elements.tomSelect.dispatchEvent(new Event('change'));
            this.cifraPlayer.preencherIframeCifra(musicaCifrada);
            this.cifraPlayer.addEventCifrasIframe(this.elements.iframeCifra);

            // CORREÇÃO: Destacar a primeira cifra logo ao carregar
            setTimeout(() => {
                this.cifraPlayer.selecionarPrimeiraCifra();
            }, 100);
        } else {
            this.uiController.esconderBotoesTom();
            this.uiController.esconderBotoesAcordes();
            this.elements.bpmContainer.classList.add('d-none');
            this.elements.draggableControls.classList.add('d-none');
            this.elements.instrumentsWrapper.classList.add('d-none');
            this.elements.pianoWrapper.classList.add('d-none');
            this.elements.bottomSpacer.classList.remove('d-none');

            this.cifraPlayer.preencherIframeCifra(texto);
        }
        this.preencherLayoutDoLocalStorage(saveData);
    }

    async preencherLayoutDoLocalStorage(saveData) {
        if (saveData && saveData.instrument) {
            // Retrocompatibilidade para músicas salvas antes do update
            let mode = saveData.instrumentMode;
            if (!mode) {
                mode = saveData.instrument === 'orgao' ? 'orgao' : 'bateria';
            }
            await this.changeInstrumentMode(mode);

            this.elements.bpmInput.value = saveData.bpm;
            this.setBPM(saveData.bpm);

            if (mode === 'orgao' || mode === 'piano') {
                this.elements.melodyStyleSelect.value = saveData.style;
                this.elements.melodyStyleSelect.dispatchEvent(new Event('change'));
            } else if (mode === 'bateria') {
                this.elements.drumStyleSelect.value = saveData.style;
                this.elements.drumStyleSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    async showLetraCifra(saveData) {
        // 1. Identifica o nome da música (chave usada no localStorage)
        const songName = this.elements.savesSelect.value;

        // 2. Identifica o tipo (Fallback para dados antigos caso 'type' não exista)
        const type = saveData.type || (saveData.chords?.includes('@') ? 'partitura' : 'cifra');

        this.uiController.exibirIframeCifra();
        this.uiController.exibirBotoesTom();
        this.cifraPlayer.indiceAcorde = 0;

        // Garante a restauração visual caso viéssemos de uma Letra anterior
        this.elements.bpmContainer.classList.remove('d-none');
        this.elements.draggableControls.classList.remove('d-none');
        this.elements.instrumentsWrapper.classList.remove('d-none');
        this.elements.pianoWrapper.classList.remove('d-none');
        this.elements.bottomSpacer.classList.add('d-none');

        // 3. Lógica de renderização por tipo
        if (type === 'partitura') {
            const dataArray = saveData.chords.split('\n').filter(l => l.trim() !== '');

            this.elements.partituraFrame.classList.remove('d-none');
            this.elements.iframeCifra.classList.add('d-none');

            this.partituraOriginalKey = saveData.key || 'C';
            this.cifraPlayer.tomOriginal = this.partituraOriginalKey;
            this.elements.tomSelect.value = this.partituraOriginalKey;

            if (!this.partituraPlayer._initialized) await this.partituraPlayer.init();

            this.partituraEditor.renderizarVisualizacao(dataArray);
            this.uiController.exibirBotoesCifras();
        } else if (type === 'cifra') {
            this.elements.iframeCifra.removeAttribute('src'); // Limpa o modo partitura
            const texto = saveData.chords ?? saveData;
            const textoMusica = this.cifraPlayer.destacarCifras(texto, saveData.key || null);

            this.verifyLetraOuCifra(textoMusica, saveData.chords ? saveData : null);
            this.uiController.esconderPartitura();
            this.uiController.exibirBotoesCifras();
        }

        // 4. Aplica as configurações de BPM, Instrumento e Estilo
        await this.preencherLayoutDoLocalStorage(saveData);
    }

    salvarMetaDataNoLocalStorage(name, item, chords = null) {
        const metaData = {
            chords: chords ?? this.elements.editTextarea.value,
            key: this.elements.tomSelect.value,
            instrument: this.cifraPlayer.instrumento,
            instrumentMode: this.currentInstrumentMode, // NOVO CAMPO PARA SABER SE É PIANO
            style: (this.currentInstrumentMode === 'bateria')
                ? this.elements.drumStyleSelect.value
                : this.elements.melodyStyleSelect.value,
            bpm: this.elements.bpmInput.value,
            type: this.currentEditorType || 'cifra'
        };
        this.localStorageManager.saveJson(name, item, metaData);
    }

    async verificarTrocouTom() {
        if (this.cifraPlayer.tomOriginal && this.cifraPlayer.tomOriginal !== this.cifraPlayer.tomAtual) {
            const tom = this.cifraPlayer.tomAtual;
            const confirmed = await this.uiController.customConfirm(`Você trocou de tom de ${this.cifraPlayer.tomOriginal} para ${tom}. Substituir novo tom?`);
            if (confirmed) {
                this.salvarMetaDataNoLocalStorage(this.LOCAL_STORAGE_SAVES_KEY, this.selectItemAntes);
            }
            this.cifraPlayer.tomOriginal = null;
        }
    }

    // App.js - Método selectEscolhido
    async selectEscolhido(selectItem) {
        this.selectItemAntes = selectItem;
        this.uiController.resetInterface();
        this.elements.partituraEditFrame.classList.add('d-none');
        this.editing = false;

        if (selectItem && selectItem !== 'acordes__') {
            const saveData = this.localStorageManager.getSaveJson(this.LOCAL_STORAGE_SAVES_KEY, selectItem);

            // CORREÇÃO: Atualiza o tipo atual para evitar que o Play toque partitura em uma cifra
            this.currentEditorType = saveData.type || (saveData.chords?.includes('@') ? 'partitura' : 'cifra');

            this.showLetraCifra(saveData);
            this.escolherStyle(saveData.style);
            this.uiController.rolarIframeParaTopo(this.elements.iframeCifra);
        }
        else {
            // Lógica para quando seleciona "Acordes" (vazio)
            this.uiController.exibirBotoesAcordes();
            var saveData = this.localStorageManager.getSaveJson(this.LOCAL_STORAGE_ACORDES_KEY, 'acordes');
            let tom = 'C';

            if (saveData) {
                if (saveData.key) {
                    tom = saveData.key;
                    await this.preencherLayoutDoLocalStorage(saveData);
                }
                else if (saveData !== '')
                    tom = saveData;
            }

            this.cifraPlayer.preencherSelectAcordes(tom);
            this.cifraPlayer.preencherAcordes(tom);
            this.elements.savesSelect.selectedIndex = 0;

            if (selectItem === 'acordes__') {
                this.cifraPlayer.preencherIframeCifra('');
                // Garante que o iframe de partitura de visualização também suma
                this.elements.partituraFrame.classList.add('d-none');
            }
        }
    }

    escolherStyle(style) {
        if (this.currentInstrumentMode === 'orgao' || this.currentInstrumentMode === 'piano') {
            this.elements.melodyStyleSelect.value = style;
        } else {
            this.elements.drumStyleSelect.value = style;
        }
    }

    getUrlParam(param = 'selecao') {
        const urlParams = new URLSearchParams(window.location.search);

        const selecaoString = urlParams.get(param);

        if (selecaoString) {
            $('#savesSelect').val(selecaoString).trigger('change');
            this.selectEscolhido(selecaoString);
        }
    }

    removerAcentosEcaracteres(str) {
        if (!str) {
            return "";
        }
        str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        str = str.replace(/[^a-zA-Z0-9]/g, "");
        return str;
    }

    async searchMusic() {
        this.musicaEscolhida = false;
        this.uiController.limparResultados();
        this.uiController.exibirInterfaceDePesquisa();

        const textoPesquisa = this.elements.searchInput.value;
        var titlesCifraClub = [];

        const termo = this.removerAcentosEcaracteres(textoPesquisa.toLowerCase().trim());

        var musicasLocais = this.todasAsCifras.filter(musica =>
            this.removerAcentosEcaracteres(musica.titulo.toLowerCase()).includes(termo) ||
            this.removerAcentosEcaracteres(musica.artista.toLowerCase()).includes(termo) ||
            this.removerAcentosEcaracteres(musica.cifra.toLowerCase()).includes(termo)
        );

        // Lógica de exibição de resultados locais
        if (musicasLocais.length > 0) {
            const max = 4;
            const topTitles = musicasLocais.slice(0, max);
            topTitles.forEach((cifra) => {
                const title = `${cifra.titulo} - ${cifra.artista ?? ''}`;
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';
                const link = document.createElement('a');
                link.href = '#';
                link.onclick = () => this.choseCifraLocal(cifra.id);
                link.textContent = title;
                listItem.appendChild(link);
                this.elements.searchResultsList.appendChild(listItem);
            });

            this.uiController.esconderInterfaceDePesquisa();
        }

        // Lógica de pesquisa na Web (mantida igual, com ajuste para `this`)
        try {
            const response = await fetch(`${this.API_BASE_URL}/pesquisar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: textoPesquisa }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (data.success) {
                if (this.musicaEscolhida)
                    return;

                const { lista: titles, links } = data;
                titlesCifraClub = titles;
                if (titles.length > 0) {
                    const max = 4;
                    const topTitles = titles.slice(0, max);
                    topTitles.forEach((title, index) => {
                        const listItem = document.createElement('li');
                        listItem.className = 'list-group-item';
                        const link = document.createElement('a');
                        link.href = '#';
                        link.onclick = () => this.choseLink(links[index], title);
                        link.textContent = title;
                        listItem.appendChild(link);
                        this.elements.searchResultsList.appendChild(listItem);
                    });
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            await this.uiController.customAlert(`Erro na busca: ${error.message}`, 'Erro!');
            this.elements.savesList.classList.remove('d-none');
            this.elements.searchResultsList.classList.add('d-none');
        } finally {
            this.uiController.esconderInterfaceDePesquisa();
            this.uiController.pararspinnerloading();
        }

        if (musicasLocais.length === 0 && titlesCifraClub.length === 0) {
            this.elements.searchResultsList.innerHTML = '<li class="list-group-item">Nenhuma cifra encontrada.</li>';
        }
    }

    async choseCifraLocal(id) {
        this.musicaEscolhida = true;
        this.uiController.limparResultados();

        const musica = this.todasAsCifras.find(c => c.id === id);
        if (!musica) {
            await this.uiController.customAlert('Cifra não encontrada.', 'Erro!');
            return;
        }

        const texto = musica.cifra;
        const titulo = musica.titulo;

        this.elements.cifraDisplay.textContent = texto;

        if (this.elements.searchModalLabel.textContent === 'Música') {
            this.elements.searchModalLabel.textContent = titulo.split(' - ')[0];
        }
        this.uiController.exibirBotaoTocar();
    }

    async choseLink(urlLink, titulo) {
        this.uiController.limparResultados();

        try {
            const response = await fetch(`${this.API_BASE_URL}/downloadsite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlLink }),
            });
            const data = await response.json();
            if (data.success) {
                var texto = this.cifraPlayer.removerTagsDaCifra(data.message);
                this.elements.cifraDisplay.textContent = texto;
                this.uiController.exibirBotaoTocar();
            } else {
                await this.uiController.customAlert(data.message, 'Erro!');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            await this.uiController.customAlert('Erro ao baixar a cifra. Tente novamente mais tarde.', 'Erro!');
        } finally {
            this.uiController.exibirBotaoTocar();
        }
    }

    togglePressedState(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;

        if (action === 'notes') {
            var icon = this.elements.notesButton.querySelector('i');
            if (!this.held && this.elements.musicNoteBeamedIcon.classList.contains('d-none')) {
                this.cifraPlayer.acordeFull = false;
                this.elements.musicNoteIcon.classList.add('d-none');
                this.elements.musicNoteBeamedIcon.classList.remove('d-none');
                this.elements.notesButton.classList.remove('notaSolo');
            }
            else if (this.elements.notesButton.classList.contains('pressed')) {
                this.cifraPlayer.acordeFull = false;
                this.elements.musicNoteIcon.classList.remove('d-none');
                this.elements.musicNoteBeamedIcon.classList.add('d-none');

                this.elements.notesButton.classList.remove('pressed');
                this.elements.notesButton.classList.add('notaSolo');
            } else if (!this.elements.notesButton.classList.contains('notaSolo')) {
                this.cifraPlayer.acordeFull = true;
                this.elements.notesButton.classList.add('pressed');
            }
        } else {
            if (action === 'acorde') {
                this.cifraPlayer.parado = false;
                this.cifraPlayer.tocarAcorde(button.value);

                // --- NOVO: Adiciona a cifra na partitura se estiver no modo de edição ---
                if (this.currentEditorType === 'partitura' && !this.elements.partituraEditFrame.classList.contains('d-none')) {
                    this.partituraEditor.setChordToCurrentNote(button.value);
                }
            }

            document.querySelectorAll('button[data-action="acorde"]').forEach(btn => {
                if (btn !== button) {
                    btn.classList.remove('pressed');
                }
            });

            button.classList.remove('pressed');
            setTimeout(() => button.classList.add('pressed'), 100);

            if (action === 'play' || action === 'acorde') {
                this.tocarBateriaMelody();

                setTimeout(() => button.classList.add('pulse'), 100);
                this.uiController.exibirBotaoStop();
            } else if (action === 'stop') {
                this.uiController.exibirBotaoPlay();
            }
        }
    }

    tocarBateriaMelody() {
        if ((this.currentInstrumentMode === 'orgao' || this.currentInstrumentMode === 'piano') && this.elements.melodyStyleSelect.value) {
            this.melodyUI.play();
            this.melodyMachine.currentStep = 1;
        } else {
            if (this.bateriaUI) this.bateriaUI.play();
        }
    }

    exibirFrame(frameId) {
        this.uiController.resetInterface(true);
        this.uiController.exibirBotoesTom();
        this.uiController.exibirBotoesAcordes();

        var saveData = this.localStorageManager.getSaveJson(this.LOCAL_STORAGE_ACORDES_KEY, frameId);
        let tom = 'C';

        if (saveData) {
            if (saveData.key) {
                tom = saveData.key;
                this.preencherLayoutDoLocalStorage(saveData);
            }
            else if (saveData !== '')
                tom = saveData;
        }
        this.cifraPlayer.preencherAcordes(tom);
        this.cifraPlayer.preencherSelectCifras(tom);
        this.uiController.exibirFrame(frameId);
    }

    pesquisarWeb(texto) {
        this.pesquisarNaWeb = true;
        this.elements.searchInput.value = texto;
        $('#searchModal').modal('show');
        this.searchMusic();
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    async restore() {
        const confirmed = await this.uiController.customConfirm('Tem certeza que deseja restaurar? Isso apagará todas as músicas salvas.');
        if (confirmed) {
            localStorage.clear();
            location.reload();
        }
    }

    // --------------------------------------------------------
    // INÍCIO - LÓGICA DE IMPORTAÇÃO COM SELEÇÃO
    // --------------------------------------------------------
    uploadSaves() {
        let input = document.getElementById('uploadSavesInput');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.style.display = 'none';
            input.id = 'uploadSavesInput';
            document.body.appendChild(input);
        }

        input.value = '';

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);

                    if (typeof importedData !== 'object') {
                        await this.uiController.customAlert('Arquivo inválido: Não é um objeto ou array.', 'Erro!');
                        return;
                    }

                    let newSaves = {};

                    const padronizarItem = (conteudo) => {
                        const type = conteudo.type || (conteudo.chords?.includes('@') ? 'partitura' : 'cifra');
                        return {
                            chords: conteudo.chords ?? '',
                            key: conteudo.key ?? 'C',
                            instrument: conteudo.instrument ?? 'orgao',
                            style: conteudo.style ?? '',
                            bpm: conteudo.bpm ?? 90,
                            type: type,
                        };
                    };

                    if (Array.isArray(importedData)) {
                        importedData.forEach(item => {
                            if (item.titulo && item.chords) {
                                const chave = item.artista ? `${item.titulo} - ${item.artista}` : item.titulo;
                                const dadosPadronizados = padronizarItem(item);
                                if (dadosPadronizados) newSaves[chave] = dadosPadronizados;
                            }
                        });
                    } else {
                        Object.keys(importedData).forEach(key => {
                            const dadosPadronizados = padronizarItem(importedData[key]);
                            if (dadosPadronizados) newSaves[key] = dadosPadronizados;
                        });
                    }

                    if (Object.keys(newSaves).length === 0) {
                        await this.uiController.customAlert('Arquivo importado, mas sem cifras válidas.', 'Aviso');
                        return;
                    }

                    // Ao invés de salvar direto, abre o modal de seleção
                    this._showImportModal(newSaves);

                } catch (err) {
                    console.error(err);
                    await this.uiController.customAlert(`Erro ao processar o arquivo: ${err.message}`, 'Erro!');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    _showImportModal(newSaves) {
        $('#optionsModal').modal('hide');
        const currentSaves = this.localStorageManager.getSavesJson(this.LOCAL_STORAGE_SAVES_KEY);
        const importKeys = Object.keys(newSaves).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        const importList = document.getElementById('importList');
        importList.innerHTML = '';

        importKeys.forEach((key, index) => {
            const jaExiste = currentSaves.hasOwnProperty(key);
            // Cria um badge indicando se a música é nova ou se já existe (avisando que vai sobrescrever)
            const badge = jaExiste
                ? `<span class="badge badge-warning ml-2" style="font-size:10px;">Substituirá atual</span>`
                : `<span class="badge badge-success ml-2" style="font-size:10px;">Nova</span>`;

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
            li.innerHTML = `
                <div class="custom-control custom-checkbox text-left w-100">
                    <input type="checkbox" class="custom-control-input import-checkbox" id="importChk_${index}" value="${key}" checked>
                    <label class="custom-control-label" for="importChk_${index}">${key} ${badge}</label>
                </div>
            `;
            importList.appendChild(li);
        });

        const selectAll = document.getElementById('selectAllImport');
        selectAll.checked = true;
        selectAll.onchange = (e) => {
            const checkboxes = document.querySelectorAll('.import-checkbox');
            checkboxes.forEach(chk => chk.checked = e.target.checked);
        };

        const btnConfirm = document.getElementById('btnConfirmImport');
        btnConfirm.onclick = async () => {
            const selectedCheckboxes = document.querySelectorAll('.import-checkbox:checked');
            if (selectedCheckboxes.length === 0) {
                this.uiController.customAlert('Selecione pelo menos uma música para importar.', 'Aviso');
                return;
            }

            let finalSavesToImport = {};
            selectedCheckboxes.forEach(chk => {
                const key = chk.value;
                finalSavesToImport[key] = newSaves[key];
            });

            // Mescla as músicas selecionadas com o banco atual
            const mergedSaves = { ...currentSaves, ...finalSavesToImport };
            localStorage.setItem(this.LOCAL_STORAGE_SAVES_KEY, JSON.stringify(mergedSaves));

            this.uiController.exibirListaSaves();

            $('#importModal').modal('hide');
            await this.uiController.customAlert(`${Object.keys(finalSavesToImport).length} música(s) importada(s) com sucesso!`, 'Sucesso!');
        };

        $('#importModal').modal('show');
    }

    // --------------------------------------------------------
    // INÍCIO - LÓGICA DE EXPORTAÇÃO COM SELEÇÃO
    // --------------------------------------------------------
    downloadSaves() {
        $('#optionsModal').modal('hide');
        const saves = this.localStorageManager.getSavesJson(this.LOCAL_STORAGE_SAVES_KEY);
        const saveKeys = Object.keys(saves).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (saveKeys.length === 0) {
            this.uiController.customAlert('Nenhuma música salva para exportar.', 'Aviso');
            return;
        }

        const exportList = document.getElementById('exportList');
        exportList.innerHTML = '';

        saveKeys.forEach((key, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
            li.innerHTML = `
                <div class="custom-control custom-checkbox w-100">
                    <input type="checkbox" class="custom-control-input export-checkbox" id="exportChk_${index}" value="${key}">
                    <label class="custom-control-label" for="exportChk_${index}">${key}</label>
                </div>
            `;
            exportList.appendChild(li);
        });

        // Lógica do botão Selecionar Todos
        const selectAll = document.getElementById('selectAllExport');
        selectAll.checked = false; // Inicia desmarcado
        selectAll.onchange = (e) => {
            const checkboxes = document.querySelectorAll('.export-checkbox');
            checkboxes.forEach(chk => chk.checked = e.target.checked);
        };

        // Lógica do botão de Confirmar
        const btnConfirm = document.getElementById('btnConfirmExport');
        btnConfirm.onclick = () => {
            const selectedCheckboxes = document.querySelectorAll('.export-checkbox:checked');
            if (selectedCheckboxes.length === 0) {
                this.uiController.customAlert('Selecione pelo menos uma música.', 'Aviso');
                return;
            }

            const selectedKeys = Array.from(selectedCheckboxes).map(chk => chk.value);
            this._processDownload(saves, selectedKeys);

            $('#exportModal').modal('hide');
        };

        $('#exportModal').modal('show');
    }

    _processDownload(saves, selectedKeys) {
        const nomeDoArquivo = 'repertorio-orgao-web.json';
        let maxId = 0;

        const arrayDeCifras = selectedKeys.map((nomeCompleto) => {
            maxId++;
            const conteudoCifra = saves[nomeCompleto];

            let titulo = nomeCompleto;
            let artista = '';

            const partes = nomeCompleto.split(' - ');
            if (partes.length > 1) {
                artista = partes.pop().trim();
                titulo = partes.join(' - ').trim();
            } else if (nomeCompleto.includes('-')) {
                titulo = nomeCompleto;
            }

            return {
                id: maxId,
                artista: artista,
                titulo: titulo,
                bpm: conteudoCifra.bpm,
                chords: conteudoCifra.chords,
                key: conteudoCifra.key,
                instrument: conteudoCifra.instrument,
                style: conteudoCifra.style,
                type: conteudoCifra.type || 'cifra',
            };
        });

        const dataString = JSON.stringify(arrayDeCifras, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeDoArquivo;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    downloadStyles() {
        const key = this.STYLES_LOCAL_KEY;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                this.uiController.customAlert('Não há drumStylesData salvo no localStorage.', 'Aviso');
                return;
            }

            let data;
            try {
                data = JSON.parse(raw);
            } catch (parseErr) {
                this.uiController.customAlert('Conteúdo de drumStylesData inválido (JSON).', 'Erro');
                return;
            }

            const filename = (document.getElementById('downloadStylesLink')?.dataset?.filename) || 'drum-styles.json';
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            this.uiController.customAlert('Erro ao gerar o arquivo de download dos styles.', 'Erro');
        }
    }

    fullScreen() {
        if (this.isMobileDevice()) {
            if (!document.fullscreenElement &&    // Opera 12.1, Firefox, Chrome, Edge, Safari
                !document.webkitFullscreenElement && // Old WebKit
                !document.mozFullScreenElement && // Old Firefox
                !document.msFullscreenElement) {  // IE/Edge

                var el = document.documentElement;
                var requestMethod = el.requestFullscreen || el.webkitRequestFullscreen ||
                    el.mozRequestFullScreen || el.msRequestFullscreen;

                if (requestMethod) {
                    requestMethod.call(el);
                }

                try {
                    navigator.wakeLock.request("screen");
                } catch { }
            }
        }
    }

    migrateLocalStorageSaves() {
        try {
            const rawData = localStorage.getItem(this.LOCAL_STORAGE_SAVES_KEY);

            if (!rawData) return;

            if (rawData.includes('chords')) {
                return;
            }

            let saves = {};
            try {
                saves = JSON.parse(rawData);
            } catch (e) {
                console.error("Erro ao analisar JSON do localStorage:", e);
                return;
            }

            Object.keys(saves).forEach(key => {
                let valorAtual = saves[key];

                saves[key] = {
                    chords: valorAtual,
                    key: 'C',
                    instrument: 'orgao',
                    style: '',
                    bpm: 90
                };
            });

            localStorage.setItem(this.LOCAL_STORAGE_SAVES_KEY, JSON.stringify(saves));
            console.log('Sistema: LocalStorage "saves" foi migrado para o novo formato de objetos.');

        } catch (error) {
            console.error('Erro crítico na migração de saves:', error);
        }
    }

    async salvarSave(newSaveName, oldSaveName) {
        // 1. Define um nome padrão caso o usuário não tenha digitado nenhum
        if (!newSaveName) {
            const musicasDefault = this.elements.savesSelect.querySelectorAll('option[value^="Música "]');
            const count = musicasDefault.length + 1;
            newSaveName = "Música " + count;
        }

        const saves = this.localStorageManager.getSavesJson(this.LOCAL_STORAGE_SAVES_KEY);
        newSaveName = newSaveName.trim();

        // 2. Verifica se o nome já existe (para evitar sobrescrever outra música por erro)
        // Se o nome existe e não é a música que já estávamos editando, avisa o usuário.
        const temSaveName = Object.keys(saves).some(saveName => saveName.toLowerCase() === newSaveName.toLowerCase());
        const alterouNome = oldSaveName && oldSaveName.toLowerCase() !== newSaveName.toLowerCase();

        if (temSaveName && (alterouNome || !oldSaveName)) {
            await this.uiController.customAlert(`Já existe uma música chamada "${newSaveName}". Escolha outro nome.`, 'Salvar Música');
            return;
        }

        // --- 3. COLETA O CONTEÚDO (O CORPO DA MÚSICA) ---
        let content = "";
        if (this.currentEditorType === 'partitura') {
            content = this.partituraEditor.obterDadosParaSalvar(); // COLECIONA OS DADOS
        } else {
            content = this.elements.editTextarea.value;
        }

        // Importante: Atualizamos o valor do editTextarea com o conteúdo coletado, 
        // pois o método 'salvarMetaDataNoLocalStorage' lê os dados de lá caso não sejam passados.
        this.elements.editTextarea.value = content;

        // 4. Lógica para identificar o Tom (Key)
        const musicaCifrada = this.cifraPlayer.destacarCifras(content, null);
        // 4. Lógica para identificar o Tom (Key)
        let tom;

        if (this.currentEditorType === 'partitura') {
            // Para partitura usa direto o tomSelect — já foi transposto pelo usuário
            tom = this.elements.tomSelect.value || 'C';
        } else {
            const musicaCifrada = this.cifraPlayer.destacarCifras(content, null);
            if (this.cifraPlayer.tomOriginal && this.cifraPlayer.tomOriginal !== this.elements.tomSelect.value) {
                tom = this.elements.tomSelect.value;
            } else {
                tom = this.cifraPlayer.descobrirTom(musicaCifrada) || this.elements.tomSelect.value || 'C';
            }
        }

        this.elements.tomSelect.value = tom;

        // 5. Se foi uma edição com troca de nome, remove o registro antigo
        if (oldSaveName && oldSaveName !== newSaveName) {
            this.localStorageManager.deleteJson(this.LOCAL_STORAGE_SAVES_KEY, oldSaveName);
        }

        // 6. Grava os dados finais no LocalStorage
        // Isso chama a função que monta o objeto com type, chords, bpm, instrument, style, etc.
        this.salvarMetaDataNoLocalStorage(this.LOCAL_STORAGE_SAVES_KEY, newSaveName, content);

        // 7. Atualiza o Select principal para focar na música salva
        this.elements.savesSelect.value = newSaveName;

        // 8. Limpa a interface de edição
        this.uiController.resetInterface();
        this.elements.partituraEditFrame.classList.add('d-none'); // Esconde o editor gráfico
        this.uiController.exibirIframeCifra(); // Volta para o iframe de visualização
        this.uiController.exibirListaSaves(newSaveName); // Recarrega a lista do select2

        // 9. Renderiza a música salva imediatamente na tela
        this.selectEscolhido(newSaveName);
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            const isSecureProtocol = location.protocol === 'https:';

            if (!isSecureProtocol && !isLocalhost) {
                console.log('Service Worker registration skipped: insecure or unsupported origin');
                return;
            }

            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('Service Worker registrado com sucesso:', registration.scope);

                        // 1. Força a verificação de atualizações no servidor TODA VEZ que abrir o app
                        registration.update();

                        // 2. Escuta quando um sw.js novo (diferente) for encontrado no servidor
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                // Se a nova versão terminou de baixar os novos caches e está "esperando"
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {

                                    console.log('Nova versão encontrada! Atualizando automaticamente...');
                                    newWorker.postMessage({ action: 'skipWaiting' });
                                }
                            });
                        });
                    })
                    .catch(registrationError => {
                        console.log('Falha ao registrar o Service Worker:', registrationError);
                    });
            });

            // 4. Recarrega a página automaticamente assim que o novo Service Worker assumir o controle
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }

    loadCifrasLocal() {
        var cifrasLocal = `${this.BASE_URL}/cifras.json`;

        fetch(cifrasLocal)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Não foi possível carregar o arquivo de cifras local.');
                }
                return response.json();
            })
            .then(data => {
                this.todasAsCifras = data;
                console.log(`${this.todasAsCifras.length} cifras locais carregadas com sucesso.`);
            })
            .catch(error => {
                console.error(error);
            });
    }

    warmupApi() {
        try {
            fetch(this.API_BASE_URL + '/')
                .then(response => response.json())
                .catch(() => console.log("API Warmup failed/ignored."));
        } catch (err) {
            console.log("API Warmup failed/ignored.", err.message);
        }
    }

    setupDarkMode() {
        localStorage.setItem('scrollTop', 0); // Zera a barra de rolagem de missa
        this.elements.darkModeToggle.checked = true;
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            this.uiController.updateSwitchDarkMode();
            this.uiController.aplicarModoEscuroIframe();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Definição do objeto 'elements' (mantida fora da classe App por ser um seletor de DOM global)
    // O ideal seria passar apenas o 'container' e ter o App responsável por buscar os elementos internos.
    const elements = {
        controlButtons: document.getElementById('controlButtons'),
        cifraDisplay: document.getElementById('cifraDisplay'),
        editTextarea: document.getElementById('editTextarea'),
        tocarButton: document.getElementById('tocarButton'),
        saveButton: document.getElementById('saveButton'),
        cancelButton: document.getElementById('cancelButton'),
        addButton: document.getElementById('addButton'),
        playButton: document.getElementById('playButton'),
        avancarButton: document.getElementById('avancarButton'),
        retrocederButton: document.getElementById('retrocederButton'),
        notesButton: document.getElementById('notesButton'),
        stopButton: document.getElementById('stopButton'),
        searchButton: document.getElementById('searchButton'),
        clearButton: document.getElementById('clearButton'),
        searchInput: document.getElementById('searchInput'),
        spinner: document.querySelector('.spinner-border'),
        searchIcon: document.getElementById('searchIcon'),
        searchResultsList: document.getElementById('searchResults'),
        savesList: document.getElementById('saves'),
        pulseRange: document.getElementById('pulseRange'),
        bpmValue: document.getElementById('bpmValue'),
        iframeCifra: document.getElementById('iframeCifra'),
        santamissaFrame: document.getElementById('santamissaFrame'),
        oracoesFrame: document.getElementById('oracoesFrame'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        searchModalLabel: document.getElementById('searchModalLabel'),
        savesSelect: document.getElementById('savesSelect'),
        selectContainer: document.getElementById('selectContainer'),
        selectedButton: document.getElementById('selectedButton'),
        editSavesSelect: document.getElementById('editSavesSelect'),
        deleteSavesSelect: document.getElementById('deleteSavesSelect'),
        tomSelect: document.getElementById('tomSelect'),
        decreaseTom: document.getElementById('decreaseTom'),
        increaseTom: document.getElementById('increaseTom'),
        tomContainer: document.getElementById('tomContainer'),
        itemNameInput: document.getElementById('itemNameInput'),
        oracoesEucaristicasLink: document.getElementById('oracoesEucaristicasLink'),
        missaOrdinarioLink: document.getElementById('missaOrdinarioLink'),
        liturgiaDiariaLink: document.getElementById('liturgiaDiariaLink'),
        oracoesLink: document.getElementById('oracoesLink'),
        aboutLink: document.getElementById('about'),
        downloadSavesLink: document.getElementById('downloadSavesLink'),
        uploadSavesLink: document.getElementById('uploadSavesLink'),
        restoreLink: document.getElementById('restoreLink'),
        downloadStylesLink: document.getElementById('downloadStylesLink'),
        liturgiaDiariaFrame: document.getElementById('liturgiaDiariaFrame'),
        partituraFrame: document.getElementById('partituraFrame'),
        partituraEditFrame: document.getElementById('partituraEditFrame'),
        acorde1: document.getElementById('acorde1'),
        acorde2: document.getElementById('acorde2'),
        acorde3: document.getElementById('acorde3'),
        acorde4: document.getElementById('acorde4'),
        acorde5: document.getElementById('acorde5'),
        acorde6: document.getElementById('acorde6'),
        acorde7: document.getElementById('acorde7'),
        acorde8: document.getElementById('acorde8'),
        acorde9: document.getElementById('acorde9'),
        acorde10: document.getElementById('acorde10'),
        acorde11: document.getElementById('acorde11'),
        borderRight: document.getElementById('borderRight'),
        borderLeft: document.getElementById('borderLeft'),
        draggableControls: document.getElementById('draggableControls'),
        orgaoInstrumentButton: document.getElementById('orgaoInstrumentButton'),
        bateriaInstrumentButton: document.getElementById('bateriaInstrumentButton'),
        bpmInput: document.getElementById('bpm-input'),
        numStepsInput: document.getElementById('num-steps'),
        tracksContainer: document.getElementById('tracks'),
        rhythmButtons: Array.from(document.querySelectorAll('.rhythm-button')),
        saveRhythmButton: document.getElementById('save-rhythm'),
        drumStyleSelect: document.getElementById('drumStyleSelect'),
        melodyStyleSelect: document.getElementById('melodyStyleSelect'),
        addStyleButton: document.getElementById('addStyle'),
        editStyleButton: document.getElementById('editStyle'),
        deleteStyleButton: document.getElementById('deleteStyle'),
        copyRhythmButton: document.getElementById('copy-rhythm'),
        pasteRhythmButton: document.getElementById('paste-rhythm'),
        bateriaWrapper: document.getElementById('bateriaWrapper'),
        melodyWrapper: document.getElementById('melodyWrapper'),
        instrumentsWrapper: document.getElementById('instrumentsWrapper'),
        bottomSpacer: document.getElementById('bottomSpacer'),
        pianoWrapper: document.getElementById('pianoWrapper'),
        rhythmButtonsControl: document.getElementById('rhythm-buttons'),
        musicNoteIcon: document.getElementById('music-note'),
        musicNoteBeamedIcon: document.getElementById('music-note-beamed'),
        bpmContainer: document.getElementById('bpm-container')
    };

    const app = new App(elements);
    app.init();
});
