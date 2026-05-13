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

        this.styleManager = new StyleManager(
            this.storageKey,
            this.elements.melodyStyleSelect,
            null,
            true, // hasBlankOption
            (numSteps) => this.createEmptyPattern(numSteps),
            (newName) => {
                this.loadPattern(newName);
            }
        );
    }

    async init() {
        this.styleManager.loadStyles(this.melodyMachine.styles);
        if (this.elements.melodyStyleSelect.value) {
            this.loadPattern(this.elements.melodyStyleSelect.value);
        }
        this.initializeTracks();
        this.bindEvents();
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

    calcularCompasso(numSteps, ritmo) {
        let temposCompasso = 4;
        if (ritmo[0] === '2') temposCompasso = 2;
        else if (ritmo[0] === '3') temposCompasso = 3;
        else if (ritmo[0] === '6') temposCompasso = 6;

        this.melodyMachine.stepsPorTempo = numSteps / temposCompasso;
    }

    initializeTracks() {
        const numSteps = parseInt(this.numStepsInput.value, 10) || 8;
        this.melodyMachine.setNumSteps(numSteps);
        this.tracksContainer.innerHTML = '';
        this.calcularCompasso(numSteps, this.elements.melodyStyleSelect.value);
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

        const storage = this.styleManager.getStorageData();
        storage.data[styleName] = patternData;
        this.styleManager.persistStorageData(storage);

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
        const storage = this.styleManager.getStorageData();
        const data = storage.data ? storage.data[styleName] : null;

        if (!data) {
            this.clearSteps();
            return;
        }

        //if (data.numSteps && data.numSteps !== parseInt(this.numStepsInput.value)) {
        this.numStepsInput.value = data.numSteps;
        this.initializeTracks();
        //}

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

        this.addStyleBtn.addEventListener('click', () => this.styleManager.addStyle(parseInt(this.numStepsInput.value, 10)));
        this.editStyleBtn.addEventListener('click', () => this.styleManager.editStyle());
        this.deleteStyleBtn.addEventListener('click', () => this.styleManager.deleteStyle());
    }

    reLoadPattern() {
        this.loadPattern(this.elements.melodyStyleSelect.value);
        if (this.elements.melodyStyleSelect.value === '')
            this.stop();
        else if (this.melodyMachine.isPlaying) {
            this.melodyMachine.stop(true);
            this.melodyMachine.start();
        }
        this.uiController.piscarPlayButton();
    }

    play() {
        this.melodyMachine.stop(true);
        if (!this.melodyMachine.isPlaying) {
            this.melodyMachine.start();
        }
    }

    stop() {
        this.melodyMachine.stop(true);
    }
}