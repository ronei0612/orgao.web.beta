class MelodyUI {
    constructor(elements, melodyMachine, uiController) {
        this.elements = elements;
        this.melodyMachine = melodyMachine;
        this.uiController = uiController;
        this.storageKey = 'melodyStylesData';

        this.tracksContainer = document.getElementById('melodyTracks');
        this.numStepsInput = document.getElementById('melody-num-steps');

        this.addStyleBtn = document.getElementById('addMelodyStyle');
        this.editStyleBtn = document.getElementById('editMelodyStyle');
        this.deleteStyleBtn = document.getElementById('deleteMelodyStyle');
        this.saveBtn = document.getElementById('save-melody');

        this.incStepsBtn = document.getElementById('melody-increment-steps');
        this.decStepsBtn = document.getElementById('melody-decrement-steps');
    }

    async init() {
        this.loadStyles();
        this.initializeTracks();
        this.bindEvents();
    }

    getStorageData() {
        const tem_styles_melody = localStorage.getItem(this.storageKey);
        if (tem_styles_melody)
            return JSON.parse(tem_styles_melody);

        

        return this.melodyMachine.styles;
    }

    persistStorageData(obj) {
        localStorage.setItem(this.storageKey, JSON.stringify(obj));
    }

    createEmptyPattern(numSteps) {
        const patternData = {};
        this.melodyMachine.instruments.forEach(inst => {
            const key = this.getInstrumentKey(inst);
            patternData[key] = { steps: Array(numSteps).fill(0), selected: false };
        });
        patternData.numSteps = numSteps;
        return patternData;
    }

    // ALTERAÇÃO: Gera chave única baseada no índice numérico e oitava
    getInstrumentKey(inst) {
        // Ex: orgao_0_baixo
        return `${inst.name}_${inst.note}`;
    }

    loadStyles() {
        const storage = this.getStorageData();
        const styles = storage.styles || [];

        this.elements.melodyStyleSelect.innerHTML = '';

        const blankOption = document.createElement('option');
        blankOption.value = "";
        blankOption.textContent = "Sem ritmo";
        this.elements.melodyStyleSelect.appendChild(blankOption);

        styles.sort().forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = s;
            this.elements.melodyStyleSelect.appendChild(option);
        });

        if (styles.length === 0) {
            this.loadStyles();
            return;
        }

        this.elements.melodyStyleSelect.selectedIndex = 0;
        this.loadPattern(this.elements.melodyStyleSelect.value);
    }

    initializeTracks() {
        const numSteps = parseInt(this.numStepsInput.value, 10) || 8;
        this.melodyMachine.setNumSteps(numSteps);
        this.tracksContainer.innerHTML = '';

        this.melodyMachine.stepsPorTempo = numSteps / 4;

        const frag = document.createDocumentFragment();

        const instruments = this.melodyMachine.instruments;

        instruments.forEach(inst => {
            frag.appendChild(this.createTrack(inst, numSteps));
        });

        this.tracksContainer.appendChild(frag);

        if (typeof this.melodyMachine.refreshTrackCache === 'function') {
            this.melodyMachine.refreshTrackCache();
        }
    }

    createTrack(instrument, numSteps) {
        const track = document.createElement('div');
        track.className = 'track';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'track-label';
        labelDiv.style.width = '70px'; // Leve ajuste para caber "Voz X"
        labelDiv.style.marginRight = '5px';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'instrument-button';
        button.style.fontSize = '11px';
        button.style.fontWeight = 'bold';
        button.style.color = '#333';
        button.style.width = '100%';

        // ALTERAÇÃO: Texto do botão agora mostra a Voz (índice + 1)
        button.textContent = `Voz ${instrument.note + 1}`;

        // ALTERAÇÃO CRÍTICA: Adiciona os datasets que o MelodyMachine.js lê no refreshTrackCache
        button.dataset.noteIndex = instrument.note; // 0, 1, 2...
        button.dataset.name = instrument.name;      // orgao

        const dataSpan = document.createElement('span');

        // ALTERAÇÃO: Chave única para persistência (Save/Load)
        const storageKey = this.getInstrumentKey(instrument);
        dataSpan.dataset.instrument = storageKey;

        dataSpan.className = 'd-none';

        labelDiv.appendChild(button);
        labelDiv.appendChild(dataSpan);
        track.appendChild(labelDiv);

        button.addEventListener('click', () => button.classList.toggle('selected'));

        const stepsFragment = document.createDocumentFragment();
        for (let i = 1; i <= numSteps; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.volume = '0';
            step.addEventListener('click', () => this.toggleStep(step));
            stepsFragment.appendChild(step);
        }
        track.appendChild(stepsFragment);

        return track;
    }

    toggleStep(step) {
        let volume = parseInt(step.dataset.volume || '0', 10);
        volume = (volume + 1) % 3;

        step.dataset.volume = String(volume);
        step.classList.remove('active', 'low-volume');

        if (volume === 1) step.classList.add('active');
        else if (volume === 2) step.classList.add('low-volume');

        const track = step.closest('.track');
        if (track) {
            const btn = track.querySelector('.instrument-button');
            const hasSteps = Array.from(track.querySelectorAll('.step')).some(s => s.dataset.volume !== '0');
            if (hasSteps) btn.classList.add('selected');
        }
    }

    saveCurrentPattern() {
        const styleName = this.elements.melodyStyleSelect.value;
        const numSteps = parseInt(this.numStepsInput.value, 10);
        const patternData = { numSteps: numSteps };

        const tracks = this.tracksContainer.querySelectorAll('.track');
        tracks.forEach(track => {
            const labelSpan = track.querySelector('.track-label span');
            const instKey = labelSpan.dataset.instrument;

            const steps = Array.from(track.querySelectorAll('.step')).map(s => parseInt(s.dataset.volume || '0', 10));
            const isSelected = track.querySelector('.instrument-button').classList.contains('selected');

            patternData[instKey] = { steps, selected: isSelected };
        });

        const storage = this.getStorageData();
        storage.data[styleName] = patternData;
        this.persistStorageData(storage);

        // Feedback Visual
        const originalHtml = this.saveBtn.innerHTML;
        this.saveBtn.innerHTML = '<i class="bi bi-check"></i>';
        this.saveBtn.classList.add('btn-success');
        this.saveBtn.classList.remove('btn-primary');
        setTimeout(() => {
            this.saveBtn.innerHTML = originalHtml;
            this.saveBtn.classList.remove('btn-success');
            this.saveBtn.classList.add('btn-primary');
        }, 1000);
    }

    loadPattern(styleName) {
        const storage = this.getStorageData();
        const data = storage.data[styleName];

        if (!data) {
            this.clearSteps();
            return;
        }

        if (data.numSteps && data.numSteps !== parseInt(this.numStepsInput.value)) {
            this.numStepsInput.value = data.numSteps;
            this.initializeTracks();
        }

        const tracks = this.tracksContainer.querySelectorAll('.track');
        tracks.forEach(track => {
            const labelSpan = track.querySelector('.track-label span');
            const instKey = labelSpan.dataset.instrument;
            const trackData = data[instKey];

            const btn = track.querySelector('.instrument-button');
            const stepsElements = track.querySelectorAll('.step');

            if (trackData) {
                if (trackData.selected) btn.classList.add('selected');
                else btn.classList.remove('selected');

                stepsElements.forEach((step, idx) => {
                    const vol = trackData.steps[idx] || 0;
                    step.dataset.volume = String(vol);
                    step.classList.remove('active', 'low-volume');
                    if (vol === 1) step.classList.add('active');
                    else if (vol === 2) step.classList.add('low-volume');
                });
            } else {
                btn.classList.remove('selected');
                stepsElements.forEach(s => {
                    s.dataset.volume = '0';
                    s.classList.remove('active', 'low-volume');
                });
            }
        });
    }

    clearSteps() {
        const steps = this.tracksContainer.querySelectorAll('.step');
        steps.forEach(s => {
            s.dataset.volume = '0';
            s.classList.remove('active', 'low-volume');
        });
        const btns = this.tracksContainer.querySelectorAll('.instrument-button');
        btns.forEach(b => b.classList.remove('selected'));
    }

    addStyle() {
        const name = prompt("Nome do novo estilo de melodia:");
        if (name) {
            const storage = this.getStorageData();
            if (storage.styles.includes(name)) {
                alert("Estilo já existe!");
                return;
            }
            storage.styles.push(name);
            storage.data[name] = this.createEmptyPattern(parseInt(this.numStepsInput.value));
            this.persistStorageData(storage);
            this.loadStyles();
            this.elements.melodyStyleSelect.value = name;
            this.loadPattern(name);
        }
    }

    deleteStyle() {
        const name = this.elements.melodyStyleSelect.value;
        if (confirm(`Excluir estilo "${name}"?`)) {
            const storage = this.getStorageData();
            storage.styles = storage.styles.filter(s => s !== name);
            delete storage.data[name];
            this.persistStorageData(storage);
            this.loadStyles();
        }
    }

    editStyle() {
        const oldName = this.elements.melodyStyleSelect.value;
        const newName = prompt("Renomear estilo para:", oldName);
        if (newName && newName !== oldName) {
            const storage = this.getStorageData();
            const idx = storage.styles.indexOf(oldName);
            if (idx !== -1) storage.styles[idx] = newName;

            storage.data[newName] = storage.data[oldName];
            delete storage.data[oldName];

            this.persistStorageData(storage);
            this.loadStyles();
            this.elements.melodyStyleSelect.value = newName;
        }
    }

    bindEvents() {
        this.incStepsBtn.addEventListener('click', () => {
            this.numStepsInput.value = parseInt(this.numStepsInput.value) + 1;
            this.initializeTracks();
        });
        this.decStepsBtn.addEventListener('click', () => {
            const val = parseInt(this.numStepsInput.value);
            if (val > 4) {
                this.numStepsInput.value = val - 1;
                this.initializeTracks();
            }
        });

        this.numStepsInput.addEventListener('change', () => this.initializeTracks());
        this.saveBtn.addEventListener('click', () => this.saveCurrentPattern());
        this.elements.melodyStyleSelect.addEventListener('change', () => this.reLoadPattern());

        this.addStyleBtn.addEventListener('click', () => this.addStyle());
        this.editStyleBtn.addEventListener('click', () => this.editStyle());
        this.deleteStyleBtn.addEventListener('click', () => this.deleteStyle());
    }

    reLoadPattern() {
        this.loadPattern(this.elements.melodyStyleSelect.value);
        if (this.elements.melodyStyleSelect.value === '')
            this.stop();
        else if (this.melodyMachine.isPlaying) {
            this.melodyMachine.stop(true);
            this.melodyMachine.start();
        }
    }

    play() {
        if (!this.melodyMachine.isPlaying) {
            this.melodyMachine.stop(true);
            this.melodyMachine.start();
        }
    }

    stop() {
        if (this.melodyMachine.isPlaying) {
            this.melodyMachine.stop(true);
        }
    }
}