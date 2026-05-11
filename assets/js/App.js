class App {
    constructor(elements) {
        this.elements = elements;
        this.BASE_URL = location.origin.includes('file:') ? 'https://roneicostasoares.com.br/orgao.web.beta' : '.';
        this.musicTheory = new MusicTheory();
        this.uiController = new UIController(this.elements);
        this.localStorageManager = new LocalStorageManager();
        this.partituraEditor = new PartituraEditor(this.elements.partituraEditFrame, this.elements.partituraFrame, this.musicTheory);
        this.draggableController = new DraggableController(this.elements.draggableControls);
        this.cifraPlayer = new CifraPlayer(this.elements, this.uiController, this.musicTheory, this.BASE_URL);
        this.partituraPlayer = new PartituraPlayer(this.elements, this.cifraPlayer, this.partituraEditor, this.BASE_URL);

        // Em App.init(), após criar o partituraPlayer:
        this.partituraPlayer.onNotaClicada = () => {
            this.uiController.exibirBotaoStop();
            this.uiController.exibirBotoesAvancarVoltarCifra();
        };

        this.versionConfig = {
            version: '6.0.6',
            htmlMessage: `
                <p>Melhorias</p>

                <p>• Melodia e som do órgão.</p>
                👉 <button class="btn btn-outline-secondary mx-1 font-weight-bold" aria-pressed="false" type="button" style="min-width: 90px; height: 38px;">
                        Órgão
                    </button>
                </button>
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
        this.warmupApi();
        this.setupDarkMode();
        this.migrateLocalStorageSaves();
        this.uiController.exibirListaSaves();
        this.uiController.injetarEstilosNoIframeCifra();

        this.bindEvents();
        this.setupSelect2();
        this.getUrlParam();
        this.updateFillBlink(this.musicTheory.bpm);

        const drumMachine = new DrumMachine(this.BASE_URL, this.cifraPlayer, this.musicTheory);
        if (typeof drumMachine.init === 'function')
            await drumMachine.init();

        this.bateriaUI = new BateriaUI(this.elements, drumMachine, this.uiController, this.cifraPlayer);
        await this.bateriaUI.init();

        this.melodyMachine = new MelodyMachine(this.BASE_URL, this.musicTheory, this.cifraPlayer);

        await this.melodyMachine.getStyles();

        this.melodyUI = new MelodyUI(this.elements, this.melodyMachine, this.uiController);
        await this.melodyUI.init();

        this.cifraPlayer.onChordChange = () => {
            if (this.cifraPlayer.instrumento === 'orgao' && this.elements.melodyStyleSelect.value !== '') {
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

    bindEvents() {
        this.elements.santamissaFrame.addEventListener('load', this.handleSantaMissaLoad.bind(this));
        this.elements.selectedButton.addEventListener("click", this.handleSelectedButtonClick.bind(this));
        this.elements.cancelButton.addEventListener("click", this.handleCancelClick.bind(this));
        this.elements.saveButton.addEventListener('click', this.handleSaveClick.bind(this));
        this.elements.darkModeToggle.addEventListener('change', this.uiController.toggleDarkMode.bind(this.uiController));
        this.elements.tocarButton.addEventListener('click', this.handleTocarClick.bind(this));
        this.elements.tomSelect.addEventListener('change', this.handleTomSelectChange.bind(this));
        //this.elements.tomSelect.addEventListener('mousedown', () => { this.tomAnterior = this.elements.tomSelect.value; });
        //this.elements.decreaseTom.addEventListener('mousedown', () => { this.tomAnterior = this.elements.tomSelect.value;});
        //this.elements.increaseTom.addEventListener('mousedown', () => { this.tomAnterior = this.elements.tomSelect.value; });
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
        this.elements.orgaoInstrumentButton.addEventListener('click', () => this.handleOrgaoInstrumentClick());
        this.elements.bateriaInstrumentButton.addEventListener('click', () => this.handleOrgaoInstrumentClick());
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

        //document.getElementById('increment-bpm').addEventListener('click', () => {
        //    this.elements.bpmInput.value = (parseInt(this.elements.bpmInput.value, 10) || 0) + 1;
        //    this.setBPM(parseInt(this.elements.bpmInput.value, 10));
        //}); //Não remover
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

        document.getElementById('volumeOrgao').addEventListener('change', () => {
            this.melodyMachine.defaultVol = parseFloat(document.getElementById('volumeOrgao').value);
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

        $('#savesSelect').on('select2:select', function (e) {
            var selectedValue = e.params.data.id;
            appInstance.selectEscolhido(selectedValue);

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
            this.partituraPlayer.avancarNotaAtualPartitura();
        } else {
            this.cifraPlayer.avancarCifra();
        }
    }

    retroceder() {
        if (!this.elements.partituraFrame.classList.contains('d-none')) {
            this.partituraPlayer.retrocederNotaAtualPartitura();
        } else {
            this.cifraPlayer.retrocederCifra();
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
        if (selectedTom) {
            const acordesMode = !this.elements.acorde1.classList.contains('d-none');

            if (acordesMode) {
                const localStorageSalvar = this.getIframeStorageName();
                this.salvarMetaDataNoLocalStorage(this.LOCAL_STORAGE_ACORDES_KEY, localStorageSalvar);
                this.cifraPlayer.preencherAcordes(selectedTom);
            }
            else {
                // Modo partitura visualização
                if (!this.elements.partituraFrame.classList.contains('d-none')) {
                    const tomOrigem = this.tomAnterior || selectedTom;
                    const semitones = this.musicTheory.getTransposeSteps(tomOrigem, selectedTom);
                    this.tomAnterior = selectedTom; // atualiza para a próxima mudança
                    this.partituraEditor.transporVisualizacao(semitones);
                    return;
                }
                else {
                    this.cifraPlayer.transposeCifra();

                    if (!this.cifraPlayer.parado && this.cifraPlayer.acordeTocando) {
                        const button = event.currentTarget;
                        this.cifraPlayer.parado = false;
                        this.cifraPlayer.tocarAcorde(button.value);
                        button.classList.add('pressed');
                    }
                }
            }
        }
        else { // Selecionou Letra
            this.cifraPlayer.removeCifras(this.elements.iframeCifra.contentDocument.body.innerHTML);
            this.uiController.exibirBotoesAcordes();
            this.cifraPlayer.preencherSelectAcordes('C');
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

        // Verifica se o menu de edição (lápis/lixeira) está ativo
        if (!this.elements.deleteSavesSelect.classList.contains('d-none')) {

            // 1. Pergunta o tipo (Cifra ou Partitura)
            const tipo = await this.uiController.chooseEditorType();
            this.currentEditorType = tipo;

            // 2. Limpa o nome da música e o select
            this.elements.itemNameInput.value = '';
            $('#savesSelect').val('').trigger('change');

            // 3. Prepara a visualização (Mostra o Iframe de edição ou o Textarea)
            this.uiController.editarMusica(tipo);

            if (tipo === 'partitura') {
                // 4. Inicializa o editor gráfico limpo
                // Passamos um array vazio [] para o PartituraEditor colocar a nota padrão (b/4)
                this.partituraEditor.abrirEditor([]);
            } else {
                // Limpa o editor de texto normal
                this.elements.editTextarea.value = '';
            }

            // 5. Configurações padrão de UI
            this.uiController.exibirBotoesTom();
            this.uiController.exibirBotoesAcordes();
            this.cifraPlayer.preencherSelectCifras('C');
            this.elements.itemNameInput.focus();
        }

        this.uiController.toggleEditDeleteButtons();
    }

    async handleEditSaveClick() {
        const saveName = this.elements.savesSelect.value;
        if (!saveName) return;

        // 1. Busca os dados salvos
        const saveData = this.localStorageManager.getSaveJson(this.LOCAL_STORAGE_SAVES_KEY, saveName);

        // 2. Identifica o tipo (se for dado antigo sem 'type', tenta adivinhar)
        const tipo = saveData.type || (saveData.chords?.includes('@') ? 'partitura' : 'cifra');
        this.currentEditorType = tipo;

        this.editing = true;
        this.elements.itemNameInput.value = saveName;

        // 3. Prepara a UI correta
        this.uiController.editarMusica(tipo);

        if (tipo === 'partitura') {
            const dataArray = saveData.chords.split('\n').filter(l => l.trim());
            this.partituraEditor.abrirEditor(dataArray); // MANDA DESENHAR NO FRAME DE EDIT
        } else {
            // Preenche o editor de texto normal
            this.elements.editTextarea.value = saveData.chords || "";
        }

        // 4. Ajustes de botões e transposição
        this.uiController.exibirBotoesTom();
        this.uiController.exibirBotoesAcordes();
        this.cifraPlayer.preencherSelectCifras(saveData.key ?? 'C');
        this.exibirInstrument(this.cifraPlayer.instrumento);
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

        this.cifraPlayer.pararReproducao();
        this.bateriaUI.stop();
        this.melodyUI.stop();
        this.partituraPlayer.stop();
    }

    handlePlayMousedown() {
        if (this.currentEditorType === 'partitura' || (!this.elements.partituraFrame.classList.contains('d-none'))) {
            // Se houver nota selecionada, começa por ela; senão começa do início
            const startIndex = this.partituraEditor.highlightIndex !== -1
                ? this.partituraEditor.highlightIndex
                : 0;

            this.partituraPlayer.partituraPlaybackIndex = startIndex;
            this.partituraPlayer.tocarNotaAtualPartitura();
            this.uiController.exibirBotaoStop();
            this.uiController.exibirBotoesAvancarVoltarCifra();
        }
        else if (this.elements.acorde1.classList.contains('d-none')) {
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

    exibirInstrument(instrument) {
        if (instrument === 'orgao') {
            this.cifraPlayer.attack = 0.2;
            this.uiController.esconderElementosBateria();
            this.cifraPlayer.atualizarVolumeStringsParaOrgao();
        }
        else {
            this.cifraPlayer.attack = 0;
            this.uiController.exibirElementosBateria();
            this.cifraPlayer.atualizarVolumeStringsParaEpiano();
        }
    }

    handleOrgaoInstrumentClick() {
        if (this.cifraPlayer.instrumento === 'orgao') {
            this.cifraPlayer.instrumento = 'epiano';
        }
        else {
            this.cifraPlayer.instrumento = 'orgao';
        }

        this.exibirInstrument(this.cifraPlayer.instrumento);

        if (!this.elements.savesSelect.value || this.elements.savesSelect.value === 'acordes__') {
            const localStorageSalvar = this.getIframeStorageName();
            this.salvarMetaDataNoLocalStorage(this.LOCAL_STORAGE_ACORDES_KEY, localStorageSalvar);
        }
    }

    verifyLetraOuCifra(texto, saveData) {
        if (texto.includes('<pre class="cifra">')) {
            let tom = 'C';
            if (saveData && saveData.key && saveData.key !== '') {
                tom = saveData.key;
            }
            else {
                tom = this.cifraPlayer.descobrirTom(texto);
            }
            const musicaCifrada = this.cifraPlayer.destacarCifras(texto, tom);
            this.cifraPlayer.preencherSelectCifras(tom);
            this.uiController.exibirBotoesCifras();
            this.elements.tomSelect.dispatchEvent(new Event('change'));
            this.cifraPlayer.preencherIframeCifra(musicaCifrada);
            this.cifraPlayer.addEventCifrasIframe(this.elements.iframeCifra);
        }
        else {
            this.uiController.exibirBotoesAcordes();
            this.cifraPlayer.preencherSelectAcordes('C');
            this.cifraPlayer.preencherIframeCifra(texto);
        }

        this.preencherLayoutDoLocalStorage(saveData);
    }

    preencherLayoutDoLocalStorage(saveData) {
        if (saveData && saveData.instrument) {
            this.cifraPlayer.instrumento = saveData.instrument;
            this.exibirInstrument(saveData.instrument);
            this.elements.bpmInput.value = saveData.bpm;
            this.setBPM(saveData.bpm);

            if (saveData.instrument === 'orgao') {
                this.elements.melodyStyleSelect.value = saveData.style;
                this.elements.melodyStyleSelect.dispatchEvent(new Event('change'));
                this.uiController.esconderElementosBateria();
            }
            else {
                this.elements.drumStyleSelect.value = saveData.style;
                this.elements.drumStyleSelect.dispatchEvent(new Event('change'));
                this.uiController.exibirElementosBateria();
            }
        }
    }

    showLetraCifra(saveData) {
        // 1. Identifica o nome da música (chave usada no localStorage)
        const songName = this.elements.savesSelect.value;

        // 2. Identifica o tipo (Fallback para dados antigos caso 'type' não exista)
        const type = saveData.type || (saveData.chords?.includes('@') ? 'partitura' : 'cifra');

        this.uiController.exibirIframeCifra();
        this.uiController.exibirBotoesTom();
        this.cifraPlayer.indiceAcorde = 0;

        // 3. Lógica de renderização por tipo
        if (type === 'partitura') {
            const dataArray = saveData.chords.split('\n').filter(l => l.trim() !== '');

            this.elements.partituraFrame.classList.remove('d-none');
            this.elements.iframeCifra.classList.add('d-none');

            this.partituraOriginalKey = saveData.key || 'C'; // <- guardar tom original
            this.cifraPlayer.tomOriginal = this.partituraOriginalKey;

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
        this.preencherLayoutDoLocalStorage(saveData);
    }

    salvarMetaDataNoLocalStorage(name, item) {
        const metaData = {
            chords: this.elements.editTextarea.value,
            key: this.elements.tomSelect.value,
            instrument: this.cifraPlayer.instrumento,
            style: this.cifraPlayer.instrumento === 'epiano' ? this.elements.drumStyleSelect.value : this.elements.melodyStyleSelect.value,
            bpm: this.elements.bpmInput.value,
            type: this.currentEditorType || 'cifra' // NOVO: salva se é cifra ou partitura
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

    async selectEscolhido(selectItem) {
        this.selectItemAntes = selectItem;

        // 1. SEMPRE garante que os editores (texto e gráfico) sejam escondidos ao trocar de música
        this.uiController.resetInterface();
        this.elements.partituraEditFrame.classList.add('d-none');
        this.editing = false; // Desliga a flag de edição

        if (selectItem && selectItem !== 'acordes__') {
            const saveData = this.localStorageManager.getSaveJson(this.LOCAL_STORAGE_SAVES_KEY, selectItem);

            // 2. O showLetraCifra vai cuidar de carregar o partitura.html ou o HTML da cifra
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
                    this.preencherLayoutDoLocalStorage(saveData);
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
        if (this.cifraPlayer.instrumento === 'orgao') {
            this.elements.melodyStyleSelect.value = style;
        }
        else {
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
        if (this.cifraPlayer.instrumento === 'orgao') {
            this.melodyUI.play();
            this.melodyMachine.currentStep = 1;
        }
        else {
            if (this.bateriaUI)
                this.bateriaUI.play();
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
                        // Detecta tipo: usa o campo salvo, ou tenta inferir pelo conteúdo
                        const type = conteudo.type
                            || (conteudo.chords?.includes('@') ? 'partitura' : 'cifra');

                        return {
                            chords: conteudo.chords ?? '',
                            key: conteudo.key ?? 'C',
                            instrument: conteudo.instrument ?? 'orgao',
                            style: conteudo.style ?? '',
                            bpm: conteudo.bpm ?? 90,
                            type: type,  // <- adicionar
                        };
                    };

                    if (Array.isArray(importedData)) {
                        importedData.forEach(item => {
                            if (item.titulo && item.chords) {
                                const chave = item.artista ? `${item.titulo} - ${item.artista}` : item.titulo;
                                const dadosPadronizados = padronizarItem(item);

                                if (dadosPadronizados) {
                                    newSaves[chave] = dadosPadronizados;
                                }
                            }
                        });
                    }
                    // CENÁRIO B: Importando Objeto direto (dump do localStorage)
                    else {
                        Object.keys(importedData).forEach(key => {
                            const dadosPadronizados = padronizarItem(importedData[key]);
                            if (dadosPadronizados) {
                                newSaves[key] = dadosPadronizados;
                            }
                        });
                    }

                    if (Object.keys(newSaves).length === 0) {
                        await this.uiController.customAlert('Arquivo importado, mas sem cifras válidas.', 'Aviso');
                        return;
                    }

                    const currentSaves = this.localStorageManager.getSavesJson(this.LOCAL_STORAGE_SAVES_KEY);
                    const mergedSaves = { ...currentSaves, ...newSaves };
                    localStorage.setItem(this.LOCAL_STORAGE_SAVES_KEY, JSON.stringify(mergedSaves));

                    this.uiController.exibirListaSaves();

                    $('#optionsModal').modal('hide');
                    await this.uiController.customAlert('Importado com sucesso', 'Sucesso!');
                } catch (err) {
                    console.error(err);
                    await this.uiController.customAlert(`Erro ao processar o arquivo: ${err.message}`, 'Erro!');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    downloadSaves() {
        const saves = this.localStorageManager.getSavesJson(this.LOCAL_STORAGE_SAVES_KEY);
        const nomeDoArquivo = 'repertorio-orgao-web.json';

        if (Object.keys(saves).length === 0) {
            return;
        }

        let maxId = 0;
        const arrayDeCifras = Object.keys(saves).map((nomeCompleto, index) => {
            maxId++;
            const conteudoCifra = saves[nomeCompleto];

            let titulo = nomeCompleto;
            let artista = '';

            const partes = nomeCompleto.split(' - ');
            if (partes.length > 1) {
                artista = partes.pop().trim(); // A última parte é o artista
                titulo = partes.join(' - ').trim(); // O restante é o título
            } else if (nomeCompleto.includes('-')) {
                titulo = nomeCompleto;
            }

            return {
                id: maxId,
                artista: artista,
                titulo: titulo,
                bpm: conteudoCifra.bpm,
                chords: conteudoCifra.chords,
                key: conteudoCifra.key,        // <- já existia mas faltava
                instrument: conteudoCifra.instrument,
                style: conteudoCifra.style,
                type: conteudoCifra.type || 'cifra',  // <- adicionar
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
        // pois o método 'salvarMetaDataNoLocalStorage' lê os dados de lá.
        this.elements.editTextarea.value = content;

        // 4. Lógica para identificar o Tom (Key)
        const musicaCifrada = this.cifraPlayer.destacarCifras(content, null);
        let tom;

        if (this.cifraPlayer.tomOriginal && this.cifraPlayer.tomOriginal !== this.elements.tomSelect.value) {
            // Se o usuário mudou o tom manualmente no select durante a edição
            tom = this.elements.tomSelect.value;
        } else {
            // Tenta descobrir o tom automaticamente ou usa o que estiver no select
            tom = this.cifraPlayer.descobrirTom(musicaCifrada) || this.elements.tomSelect.value || 'C';
        }
        this.elements.tomSelect.value = tom;

        // 5. Se foi uma edição com troca de nome, remove o registro antigo
        if (oldSaveName && oldSaveName !== newSaveName) {
            this.localStorageManager.deleteJson(this.LOCAL_STORAGE_SAVES_KEY, oldSaveName);
        }

        // 6. Grava os dados finais no LocalStorage
        // Isso chama a função que monta o objeto com type, chords, bpm, instrument, style, etc.
        this.salvarMetaDataNoLocalStorage(this.LOCAL_STORAGE_SAVES_KEY, newSaveName);

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
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('Service Worker registrado com sucesso:', registration.scope);
                    })
                    .catch(registrationError => {
                        console.log('Falha ao registrar o Service Worker:', registrationError);
                    });
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
        fetch(this.API_BASE_URL + '/')
            .then(response => response.json())
            .catch(() => console.log("API Warmup failed/ignored."));
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
        savesList: document.getElementById(this.LOCAL_STORAGE_SAVES_KEY),
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
        pulseRange: document.getElementById('pulseRange'),
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
        rhythmButtonsControl: document.getElementById('rhythm-buttons'),
        musicNoteIcon: document.getElementById('music-note'),
        musicNoteBeamedIcon: document.getElementById('music-note-beamed')
    };

    const app = new App(elements);
    app.init();
});