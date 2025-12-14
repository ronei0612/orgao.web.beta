class BateriaUI {
    constructor(elements, drumMachine, uiController, cifraPlayer) {
        this.cifraPlayer = cifraPlayer;
        this.elements = elements;
        this.drumMachine = drumMachine;
        this.uiController = uiController;

        // State
        this.selectedRhythm = 'A';
        this.pendingRhythm = null;
        this.pendingButton = null;
        this.fillLoaded = false;
        this.defaultStyle = 'Novo Estilo';
        this.copiedRhythmData = null;
        this.storageKey = 'drumStylesData';
    }

    getStorageData() {
        const tem_styles_bateria = localStorage.getItem(this.storageKey);
        if (tem_styles_bateria)
            return JSON.parse(tem_styles_bateria);

        return this.drumMachine.styles;                
    }

    persistStorageData(obj) {
        localStorage.setItem(this.storageKey, JSON.stringify(obj));
    }
    
    getStoredRhythm(styleName, rhythmKey) {
        const s = this.drumMachine.styles;
        return s.data && s.data[styleName] ? s.data[styleName][rhythmKey] || null : null;
    }

    async init() {
        //this.ensureDefaultStyleExists();

        this.loadStyles();
        this.initializeTracks();
        this.bindEvents();
    }

    /**
     * Extrai a chave do instrumento a partir do elemento track fornecido.
     * Ele procura a imagem dentro do rótulo do track e usa o título da imagem
     * para gerar a chave do instrumento, convertendo para minúsculas e removendo espaços.
     * Se a imagem ou o título não estiverem presentes, retorna null.
     */
    getInstrumentKeyFromTrack(track) {
        const img = track.querySelector('label img');
        if (!img || !img.title) return null;
        return img.title.toLowerCase().replace(/ /g, '');
    }

    /**
     * Garantir que o estilo padrão exista no localStorage (estrutura JSON)
     */
    ensureDefaultStyleExists() {
        const storage = this.getStorageData();
        if (!storage.styles || storage.styles.length === 0) {
            storage.styles = [this.defaultStyle];
        }
        if (!storage.data) storage.data = {};
        // garantir que a entrada do estilo exista e tenha A,B,C,D e fills
        if (!storage.data[this.defaultStyle]) storage.data[this.defaultStyle] = {};
        ['A', 'B', 'C', 'D'].forEach(r => {
            const key = r;
            const fillKey = `${r}-fill`;
            if (!storage.data[this.defaultStyle][key]) {
                const numSteps = parseInt(this.elements.numStepsInput.value, 10) || 4;
                storage.data[this.defaultStyle][key] = this.createEmptyRhythm(this.bpm, numSteps);
            }
            if (!storage.data[this.defaultStyle][fillKey]) {
                const numSteps = parseInt(this.elements.numStepsInput.value, 10) || 4;
                storage.data[this.defaultStyle][fillKey] = this.createEmptyRhythm(this.bpm, numSteps);
            }
        });
        this.persistStorageData(storage);
    }

    /**
     * Cria um objeto de ritmo vazio com o BPM e número de passos fornecidos.
     * Cada instrumento terá um objeto { steps, selected }.
     * Retorna o objeto de dados do ritmo.
     */
    createEmptyRhythm(bpm, numSteps) {
        const rhythmData = {};
        (this.drumMachine.instruments || []).forEach(inst => {
            const key = inst.name.toLowerCase().replace(/ /g, '');
            rhythmData[key] = { steps: Array(numSteps).fill(0), selected: false };
        });

        rhythmData.numSteps = numSteps;
        return rhythmData;
    }

    /**
     * Carrega os estilos salvos do localStorage (estrutura JSON) e popula o seletor
     */
    loadStyles() {
        const storage = this.getStorageData();
        const styles = storage?.styles || [];
        this.elements.drumStyleSelect.innerHTML = '';
        if (!styles.length) {
            const option = document.createElement('option');
            option.value = this.defaultStyle;
            option.textContent = this.defaultStyle;
            this.elements.drumStyleSelect.appendChild(option);
            this.elements.drumStyleSelect.value = this.defaultStyle;
            return;
        }
        const sorted = styles.slice().sort((a, b) => a.localeCompare(b));
        sorted.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = s;
            this.elements.drumStyleSelect.appendChild(option);
        });
        this.elements.drumStyleSelect.selectedIndex = 0;
    }

    saveStyles() {
        const storage = this.getStorageData();
        storage.styles = Array.from(this.elements.drumStyleSelect.options).map(o => o.value);
        // preserve storage.data (do not clobber)
        this.persistStorageData(storage);
    }

    /**
     * Adiciona um novo estilo e cria ritmos vazios na estrutura JSON
     */
    addStyle() {
        const newName = prompt('Digite o nome do novo estilo:');
        if (!newName) return;
        const storage = this.getStorageData();
        if (storage.styles.includes(newName)) {
            alert('Este nome de estilo já existe.');
            return;
        }
        storage.styles.push(newName);
        storage.data[newName] = {};
        // create blank rhythms
        const numSteps = parseInt(this.elements.numStepsInput.value, 10) || 4;
        ['A', 'B', 'C', 'D'].forEach(r => {
            storage.data[newName][r] = this.createEmptyRhythm(this.bpm, numSteps);
            storage.data[newName][`${r}-fill`] = this.createEmptyRhythm(this.bpm, numSteps);
        });
        this.persistStorageData(storage);
        this.loadStyles();
        this.elements.drumStyleSelect.value = newName;
    }

    /**
     * Edita (renomeia) um estilo na estrutura JSON
     */
    editStyle() {
        const current = this.elements.drumStyleSelect.value;
        const newName = prompt('Digite o novo nome para o estilo:', current);
        if (!newName || newName === current) return;
        const storage = this.getStorageData();
        if (storage.styles.includes(newName)) {
            alert('Este nome de estilo já existe.');
            return;
        }
        const idx = storage.styles.indexOf(current);
        if (idx !== -1) storage.styles[idx] = newName;
        // rename data key
        if (storage.data && storage.data[current]) {
            storage.data[newName] = storage.data[current];
            delete storage.data[current];
        } else {
            storage.data[newName] = {};
        }
        this.persistStorageData(storage);
        this.loadStyles();
        this.elements.drumStyleSelect.value = newName;
    }

    /**
     * Exclui o estilo atualmente selecionado da estrutura JSON
     */
    deleteStyle() {
        const current = this.elements.drumStyleSelect.value;
        if (!confirm(`Tem certeza que deseja excluir o estilo "${current}"?`)) return;
        const storage = this.getStorageData();
        storage.styles = (storage.styles || []).filter(s => s !== current);
        if (storage.data && storage.data[current]) delete storage.data[current];
        this.persistStorageData(storage);
        this.loadStyles();
    }

    /**
     * Salva o ritmo atual no estilo e chave de ritmo fornecidos (estrutura JSON)
     */
    saveRhythmToStyle(styleName, rhythmKey, rhythmData) {
        const storage = this.getStorageData();
        if (!storage.data) storage.data = {};
        if (!storage.data[styleName]) storage.data[styleName] = {};
        storage.data[styleName][rhythmKey] = rhythmData;
        this.persistStorageData(storage);
    }

    /**
     * Salva o ritmo atual no localStorage para o estilo e ritmo selecionados.
     */
    saveRhythm() {
        const styleName = this.elements.drumStyleSelect.value || this.defaultStyle;
        let rhythmKey = this.selectedRhythm;
        const selectedButton = document.getElementById(`rhythm-${this.selectedRhythm.toLowerCase()}`);
        if (selectedButton && selectedButton.classList.contains('fill')) rhythmKey = `${rhythmKey}-fill`;

        const rhythmData = {};
        this.elements.tracksContainer.querySelectorAll('.track').forEach(track => {
            const instKey = this.getInstrumentKeyFromTrack(track);
            if (!instKey) return;
            const steps = Array.from(track.querySelectorAll('.step')).map(s => parseInt(s.dataset.volume || '0', 10));
            const isSelected = track.querySelector('.instrument-button')?.classList.contains('selected') || false;
            rhythmData[instKey] = { steps, selected: isSelected };
        });

        rhythmData.numSteps = parseInt(this.elements.numStepsInput.value, 10) || 4;
        this.saveRhythmToStyle(styleName, rhythmKey, rhythmData);
    }

    /**
     * Carrega o ritmo salvo para o estilo e ritmo fornecidos.
     */
    loadRhythmForStyleAndRhythm(styleName, rhythm) {
        this.loadRhythm(`${styleName}-${rhythm}`);
    }

    /**
     * Carrega o ritmo salvo do localStorage usando a chave fornecida.
     * Aceita chave no formato "Style-Rhythm" ou apenas rhythm buscando no style atual.
     */
    loadRhythm(rhythmKey) {
        // try parse "Style-Rhythm" format
        let data = null;
        const storage = this.getStorageData();
        if (rhythmKey && rhythmKey.indexOf('-') > 0) {
            const idx = rhythmKey.indexOf('-');
            const style = rhythmKey.substring(0, idx);
            const rkey = rhythmKey.substring(idx + 1);
            data = storage.data && storage.data[style] ? storage.data[style][rkey] : null;
        } else {
            const styleName = this.elements.drumStyleSelect.value || this.defaultStyle;
            data = storage.data && storage.data[styleName] ? storage.data[styleName][rhythmKey] : null;
        }

        if (!data) {
            this.clearSteps();
            return;
        }

        if (typeof data.numSteps === 'number') {
            this.elements.numStepsInput.value = data.numSteps;
            this.drumMachine.setNumSteps(data.numSteps);
            this.initializeTracks();
        }
        this.elements.tracksContainer.querySelectorAll('.track').forEach(track => {
            const instKey = this.getInstrumentKeyFromTrack(track);
            const btn = track.querySelector('.instrument-button');
            const instrumentData = data[instKey] || {};
            // support both legacy array format and { steps, selected }
            const stepsData = Array.isArray(instrumentData.steps) ? instrumentData.steps
                : (Array.isArray(instrumentData) ? instrumentData : []);
            const isSelected = !!instrumentData.selected;
            // set selection state
            if (isSelected) btn.classList.add('selected'); else btn.classList.remove('selected');
            track.querySelectorAll('.step').forEach((step, idx) => {
                const volume = Array.isArray(stepsData) && idx < stepsData.length ? stepsData[idx] : 0;
                step.dataset.volume = String(volume);
                step.classList.remove('active', 'low-volume', 'third-volume');
                if (volume === 1) step.classList.add('active');
                else if (volume === 2) step.classList.add('low-volume');
                else if (volume === 3) step.classList.add('third-volume');
            });
            // ensure instrument button selection reflects actual steps
            const isEmpty = Array.from(track.querySelectorAll('.step')).every(s => parseInt(s.dataset.volume || '0', 10) === 0);
            if (isEmpty) btn.classList.remove('selected');
            else btn.classList.add('selected');
        });
    }

    /**
     * Inicializa as faixas na interface do usuário com base nos instrumentos disponíveis na drumMachine.
     * Cria um elemento de faixa para cada instrumento e os adiciona ao contêiner de faixas.
     */
    initializeTracks() {
        this.calcularCompasso(this.elements.numStepsInput.value);
        const frag = document.createDocumentFragment();
        (this.drumMachine.instruments || []).forEach(inst => {
            frag.appendChild(this.createTrack(inst));
        });
        this.elements.tracksContainer.innerHTML = '';
        this.elements.tracksContainer.appendChild(frag);
    }

    /**
     * Cria um elemento de faixa para o instrumento fornecido.
     * O elemento de faixa inclui um botão para o instrumento e os passos correspondentes.
     * Retorna o elemento de faixa criado.
     */
    createTrack(instrument) {
        const track = document.createElement('div');
        track.className = 'track';

        const label = document.createElement('label');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'instrument-button';
        button.title = instrument.name;
        const img = document.createElement('img');
        img.className = 'instrument-icon';
        img.src = `./assets/icons/${instrument.icon}`;
        img.title = instrument.name;
        img.alt = instrument.name;
        button.appendChild(img);
        label.appendChild(button);
        track.appendChild(label);

        button.addEventListener('click', () => button.classList.toggle('selected'));

        const stepsFragment = document.createDocumentFragment();
        const currentSteps = parseInt(this.elements.numStepsInput.value, 10) || 4;
        for (let i = 1; i <= currentSteps; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.textContent = i;
            step.dataset.step = String(i);
            step.dataset.volume = '0';
            stepsFragment.appendChild(step);
        }
        track.appendChild(stepsFragment);
        return track;
    }

    /**
     * Alterna o estado do passo fornecido entre inativo, volume baixo, volume médio e volume alto.
     */
    toggleStep(step) {
        let volume = parseInt(step.dataset.volume || '0', 10);
        volume = (volume + 1) % 4;
        step.dataset.volume = String(volume);
        step.classList.remove('active', 'low-volume', 'third-volume');
        if (volume === 1) step.classList.add('active');
        else if (volume === 2) step.classList.add('low-volume');
        else if (volume === 3) step.classList.add('third-volume');

        const track = step.closest('.track');
        if (!track) return;
        const instrumentButton = track.querySelector('.instrument-button');
        const steps = Array.from(track.querySelectorAll('.step'));
        const isEmpty = steps.every(s => parseInt(s.dataset.volume || '0', 10) === 0);
        if (isEmpty) instrumentButton.classList.remove('selected'); else instrumentButton.classList.add('selected');
    }

    /**
     * Limpa todos os passos em todas as faixas, definindo-os como inativos e removendo quaisquer classes de volume.
     */
    clearSteps() {
        this.elements.tracksContainer.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'low-volume', 'third-volume');
            step.dataset.volume = '0';
        });
        // update instrument buttons
        this.elements.tracksContainer.querySelectorAll('.instrument-button').forEach(btn => btn.classList.remove('selected'));
    }

    /**
     * Copia o ritmo atual para a área de transferência interna.
     * Armazena os dados do ritmo em this.copiedRhythmData.
     */
    copyRhythm() {
        const rhythmData = {};
        this.elements.tracksContainer.querySelectorAll('.track').forEach(track => {
            const instKey = this.getInstrumentKeyFromTrack(track);
            if (!instKey) return;
            const steps = Array.from(track.querySelectorAll('.step')).map(s => parseInt(s.dataset.volume || '0', 10));
            const selected = !!track.querySelector('.instrument-button')?.classList.contains('selected');
            rhythmData[instKey] = { steps, selected };
        });
        this.copiedRhythmData = rhythmData;
    }

    /**
     * Copia o ritmo salvo para a área de transferência interna.
     * Aplica os dados do ritmo armazenados em this.copiedRhythmData às faixas atuais.
     */
    pasteRhythm() {
        if (!this.copiedRhythmData) {
            alert('Nenhum ritmo copiado.');
            return;
        }
        this.elements.tracksContainer.querySelectorAll('.track').forEach(track => {
            const instKey = this.getInstrumentKeyFromTrack(track);
            const data = this.copiedRhythmData[instKey];
            if (!data) return;
            const btn = track.querySelector('.instrument-button');
            const stepsArr = Array.isArray(data.steps) ? data.steps : [];
            if (data.selected) btn.classList.add('selected'); else btn.classList.remove('selected');
            track.querySelectorAll('.step').forEach((step, idx) => {
                const volume = idx < stepsArr.length ? stepsArr[idx] : 0;
                step.dataset.volume = String(volume);
                step.classList.remove('active', 'low-volume', 'third-volume');
                if (volume === 1) step.classList.add('active');
                else if (volume === 2) step.classList.add('low-volume');
                else if (volume === 3) step.classList.add('third-volume');
            });
            const isEmpty = Array.from(track.querySelectorAll('.step')).every(s => parseInt(s.dataset.volume || '0', 10) === 0);
            if (isEmpty) btn.classList.remove('selected'); else btn.classList.add('selected');
        });
    }

    selectFill(rhythmButton, rhythmKey, rhythmCode) {
        rhythmButton.classList.add('fill', 'pending');

        // Se estiver tocando: agendar revert para o fim da medida
        this.pendingRhythm = rhythmCode;
        this.pendingButton = rhythmButton;

        this.loadRhythm(rhythmKey);

        return;
    }

    /**
     * Seleciona o ritmo com base no botão clicado e na chave do ritmo.
     * Altera verificação de existence de fill para usar o novo JSON estruturado.
     */
    selectRhythm(rhythmButton, rhythmKey) {
        const styleName = this.elements.drumStyleSelect.value || this.defaultStyle;
        const rhythmCode = rhythmKey.replace('rhythm-', '').toUpperCase();

        this.toggleStrings(rhythmCode);

        if (this.drumMachine.isPlaying && !rhythmButton.classList.contains('selected')) {
            rhythmButton.classList.add('selected');
            this.selectFill(rhythmButton, `${styleName}-${rhythmCode}-fill`, rhythmCode);
            this.unSelectRhythmButtons(rhythmButton);
            this.fillLoaded = true;
        }
        else if (rhythmButton.classList.contains('selected')) {
            if (rhythmButton.classList.contains('fill') && !this.drumMachine.isPlaying) {
                this.unSelectRhythmButtons();
                this.fillLoaded = false;
            }
            else {
                this.selectFill(rhythmButton, `${styleName}-${rhythmCode}-fill`, rhythmCode);
                this.unSelectRhythmButtons(rhythmButton);
                this.fillLoaded = true;
            }
        }
        else {
            rhythmButton.classList.remove('fill', 'pending');
            this.fillLoaded = false;
            this.loadRhythm(`${styleName}-${rhythmCode}`);
            this.unSelectRhythmButtons(rhythmButton);

            rhythmButton.classList.add('selected');
            this.selectedRhythm = rhythmCode;
            this.pendingRhythm = rhythmCode;
            this.pendingButton = rhythmButton;
        }

        if (!this.cifraPlayer.parado) {
            this.play();
        }
    }
    
    // Calcula quantos tempos tem o compasso baseado no número de steps
    calcularCompasso(numSteps) {
        let temposCompasso = 4;
        if (numSteps === '8') temposCompasso = 2;
        else if (numSteps === '12') temposCompasso = 3;
        else if (numSteps === '24') temposCompasso = 6;
        else if (numSteps === '16') temposCompasso = 4;

        this.drumMachine.stepsPorTempo = numSteps / temposCompasso;
    }

    toggleStrings(rhythmCode) {
        if (rhythmCode === 'A' || rhythmCode === 'B' || rhythmCode === 'C') {
            this.uiController.desativarNotesButton();
        }
        else if (rhythmCode === 'D' || rhythmCode === 'E') {
            this.uiController.ativarNotesButton();
        }
    }

    /**
     * Desmarca todos os botões de ritmo, exceto o fornecido.
     * @param {any} rhythmButton
     */
    unSelectRhythmButtons(rhythmButton = null) {
        this.elements.rhythmButtons.forEach(button => {
            if (button !== rhythmButton) {
                button.classList.remove('selected', 'fill', 'pending', 'flash-accent', 'flash-weak');
            }
        });
    }

    /**
     * Quando o compasso termina, verifica se há um ritmo pendente.
     * Se houver, carrega o ritmo apropriado com base no estado do botão (fill ou não).
     */
    onStepsEnd() {
        if (this.pendingRhythm && this.drumMachine.isPlaying) {
            const selectedButton = document.getElementById(`rhythm-${this.pendingRhythm.toLowerCase()}`);

            // O estado de fill é determinado pelo botão que foi clicado.
            const isFillSelected = selectedButton && selectedButton.classList.contains('fill');

            this.selectedRhythm = this.pendingRhythm;
            this.pendingRhythm = null;

            if (this.pendingButton) {
                this.pendingButton.classList.remove('pending');
                this.pendingButton = null;
            }

            if (!isFillSelected) {
                this.loadRhythm(`${this.elements.drumStyleSelect.value}-${this.selectedRhythm}`);
                this.fillLoaded = false;

                // 2. Se o botão Clicado *está* no modo FILL
            } else {
                // A medida terminou, então ele volta para o ritmo BASE (não importa o estado anterior de this.fillLoaded)
                this.playPrato();
                this.loadRhythm(`${this.elements.drumStyleSelect.value}-${this.selectedRhythm}`);
                this.fillLoaded = false;
                selectedButton.classList.remove('fill');
            }
        }
    }

    playPrato() {
        if (this.selectedRhythm === 'C' || this.selectedRhythm === 'D' || this.selectedRhythm === 'E') {
            const prato2Buffer = this.drumMachine.buffers.get('prato-alt');
            this.drumMachine.playSound(prato2Buffer, this.drumMachine.nextNoteTime, 1);
        }
    }

    play() {
        if (!this.drumMachine.isPlaying) {
            if (this.uiController.ritmoAtivo()) {
                this.drumMachine.start();
                this.uiController.exibirBotaoStop();
            }
        }
    }

    stop() {
        if (this.drumMachine.isPlaying) {
            this.drumMachine.stop();
            this.uiController.exibirBotaoPlay();
        }
    }

    togglePlay() {
        if (!this.drumMachine.isPlaying) {
            // remove fill when starting
            this.elements.rhythmButtons.forEach(button => button.classList.remove('fill'));
            this.drumMachine.start();
        } else {
            this.drumMachine.stop();
        }
    }

    /**
     * Vincula os eventos da interface do usuário aos manipuladores apropriados.
     */
    bindEvents() {
        // Steps via delegation
        this.elements.tracksContainer.addEventListener('click', (ev) => {
            const el = ev.target;
            if (el.classList.contains('step')) this.toggleStep(el);
        });

        // Rhythm buttons
        this.elements.rhythmButtons.forEach(button => {
            // contador de cliques removido; apenas ligar o evento
            button.addEventListener('click', () => {
                this.selectRhythm(button, button.id);
            });
        });

        // Copy / Paste / Save
        this.elements.copyRhythmButton.addEventListener('click', () => this.copyRhythm());
        this.elements.pasteRhythmButton.addEventListener('click', () => this.pasteRhythm());
        this.elements.saveRhythmButton.addEventListener('click', () => this.saveRhythm());

        document.querySelector('.increment-steps').addEventListener('click', () => {
            const ns = Math.max(1, (parseInt(this.elements.numStepsInput.value, 10) || 1) + 1);
            this.elements.numStepsInput.value = ns;
            this.drumMachine.setNumSteps(ns);
            this.initializeTracks();
        });
        document.querySelector('.decrement-steps').addEventListener('click', () => {
            const ns = Math.max(1, (parseInt(this.elements.numStepsInput.value, 10) || 2) - 1);
            this.elements.numStepsInput.value = ns;
            this.drumMachine.setNumSteps(ns);
            this.initializeTracks();
        });

        this.elements.numStepsInput.addEventListener('change', () => {
            const numSteps = Math.max(1, parseInt(this.elements.numStepsInput.value, 10) || 1);
            this.elements.numStepsInput.value = numSteps;
            this.drumMachine.setNumSteps(numSteps);
            this.initializeTracks();
        });

        // Styles
        this.elements.drumStyleSelect.addEventListener('change', () => {
            this.loadRhythmForStyleAndRhythm(this.elements.drumStyleSelect.value, this.selectedRhythm);
        });
        this.elements.addStyleButton.addEventListener('click', () => this.addStyle());
        this.elements.editStyleButton.addEventListener('click', () => this.editStyle());
        this.elements.deleteStyleButton.addEventListener('click', () => this.deleteStyle());

        // Hook DrumMachine measure end to UI (if DrumMachine exposes onStepsEnd)
        if (typeof this.drumMachine.onStepsEnd === 'function') {
            const original = this.drumMachine.onStepsEnd.bind(this.drumMachine);
            this.drumMachine.onStepsEnd = () => {
                // preserve original behavior if any
                try { original(); } catch { }
                this.onStepsEnd();
            };
        } else {
            // provide a safe onStepsEnd to be used by DrumMachine
            this.drumMachine.onStepsEnd = this.onStepsEnd.bind(this);
        }
    }
}
