class RhythmEngine {
    constructor(toolbar, audioManager) {
        this.toolbar = toolbar;
        this.audio = audioManager;

        this.rawRhythms = {}; // Guarda o JSON bruto (orgao, piano, etc)
        this.currentInstrument = "orgao"; // Instrumento padrão inicial

        this.draftRhythm = this.loadDraft();
        this.activeRhythmData = null;

        this.isPlayingRhythm = false;
        this.currentStep = 0;
        this.nextStepTime = 0;
        this.nextBlinkTime = 0;

        this.currentVoicesFiles = null;

        this.initUI();
        this.startEngineLoop();
    }

    async init() {
        // Bloqueia APENAS os elementos musicais específicos durante o carregamento
        this.setMusicLoadingState(true);

        try {
            const response = await fetch('https://roneicostasoares.com.br/orgao.web.beta/styles-melody.json');
            if (response.ok) {
                this.rawRhythms = await response.json();
            }
        } catch (err) {
            console.warn("Nenhum ritmo oficial encontrado no servidor.", err);
            this.rawRhythms = {};
        }

        // Baixa o áudio básico
        await this.audio.preloadAll();

        // Libera os elementos específicos
        this.setMusicLoadingState(false);
        this.populateSelect();
        this.nextBlinkTime = this.audio.ctx.currentTime;
    }

    // Método de bloqueio leve e cirúrgico dos controles
    setMusicLoadingState(isLoading) {
        const elementsToBlock = [
            document.getElementById('key-select')?.closest('.input-group'),
            document.getElementById('bpm-input')?.closest('.input-group'),
            document.getElementById('rhythm-select')?.closest('.input-group'),
            document.getElementById('btn-play'),
            document.getElementById('btn-action-toggle'),
            document.querySelector('.piano-wrapper')
        ];

        elementsToBlock.forEach(el => {
            if (el) {
                if (isLoading) el.classList.add('music-ui-blocked');
                else el.classList.remove('music-ui-blocked');
            }
        });
    }

    // Popula o select exibindo apenas as fórmulas de compasso (ex: 1/4, 2/4, 3/4)
    populateSelect() {
        const select = document.getElementById('rhythm-select');
        if (!select) return;
        select.innerHTML = '<option value="none">Sem ritmo</option>';

        if (localStorage.getItem('rhythm_draft')) {
            select.innerHTML += '<option value="rascunho">📝 Meu Rascunho</option>';
        }

        // Pega os compassos do instrumento ativo (ex: "orgao")
        const instrumentRhythms = this.rawRhythms[this.currentInstrument];
        if (instrumentRhythms) {
            Object.keys(instrumentRhythms).forEach(timeSig => {
                select.innerHTML += `<option value="${timeSig}">${timeSig}</option>`;
            });
        }
    }

    // ============================================
    // MOTOR DE REPRODUÇÃO & METRÔNOMO
    // ============================================
    startEngineLoop() {
        const scheduler = () => {
            const now = this.audio.ctx.currentTime;
            const beatDuration = 60.0 / this.toolbar.getBpm(); // 1 step = 1 tempo

            // 1. Lógica do Metrônomo (Piscar no Play)
            if (now >= this.nextBlinkTime) {
                this.nextBlinkTime += beatDuration;
                const btnPlay = document.getElementById('btn-play');
                if (btnPlay) {
                    btnPlay.classList.add('bpm-blink');
                    setTimeout(() => btnPlay.classList.remove('bpm-blink'), 100);
                }
            }

            // 2. Lógica do Sequenciador de Ritmo (Ritmo Manual / Sync-Start)
            if (this.isPlayingRhythm && this.currentVoicesFiles && this.activeRhythmData) {
                const lookahead = 0.1;
                while (this.nextStepTime < now + lookahead) {
                    this.scheduleStep(this.currentStep, this.nextStepTime);

                    // Animação Visual na Grade (Se tiver aberta)
                    const stepToAnimate = this.currentStep;
                    const timeToAnimate = this.nextStepTime - now;
                    setTimeout(() => this.highlightGridStep(stepToAnimate), timeToAnimate * 1000);

                    this.nextStepTime += beatDuration;
                    this.currentStep++;

                    if (this.currentStep >= this.activeRhythmData.steps) {
                        this.isPlayingRhythm = false; // Finaliza ao fim (Sem Loop)
                        break;
                    }
                }
            }
            requestAnimationFrame(scheduler);
        };
        requestAnimationFrame(scheduler);
    }

    scheduleStep(stepIndex, time) {
        if (!this.activeRhythmData) return;

        for (let i = 1; i <= 5; i++) {
            const track = this.activeRhythmData[`v${i}`];
            if (!track || track.length <= stepIndex) continue;

            const state = track[stepIndex];
            if (state > 0) {
                const fileName = this.currentVoicesFiles[i];
                if (fileName) {
                    const vol = state === 1 ? 1.0 : 0.5; // Velocity (100% ou 50%)
                    this.audio.playStudioNote(fileName, vol, time);
                }
            }
        }
    }

    triggerChord(chordStr, phase) {
        const selectEl = document.getElementById('rhythm-select');
        const selectedVal = selectEl ? selectEl.value : "";
        if (!selectedVal || selectedVal === "none") {
            this.isPlayingRhythm = false;
            return;
        }

        if (selectedVal === "rascunho") {
            this.activeRhythmData = this.draftRhythm;
        } else {
            // Busca o ritmo do JSON pelo instrumento e compasso selecionados
            const rawData = this.rawRhythms[this.currentInstrument]?.[selectedVal];
            if (rawData) {
                this.activeRhythmData = {
                    steps: rawData.numSteps || rawData.steps || 8,
                    v1: rawData.vozes ? rawData.vozes[0] : (rawData.v1 || []),
                    v2: rawData.vozes ? rawData.vozes[1] : (rawData.v2 || []),
                    v3: rawData.vozes ? rawData.vozes[2] : (rawData.v3 || []),
                    v4: rawData.vozes ? rawData.vozes[3] : (rawData.v4 || []),
                    v5: rawData.vozes ? rawData.vozes[4] : (rawData.v5 || [])
                };
            } else {
                this.activeRhythmData = null;
            }
        }

        if (!this.activeRhythmData) return;

        this.currentVoicesFiles = this.calculateVoicesFiles(chordStr, phase);

        // Sync-Start: Zera e dispara!
        this.currentStep = 0;
        this.nextStepTime = this.audio.ctx.currentTime + 0.02;
        this.isPlayingRhythm = true;
    }

    calculateVoicesFiles(chordStr, phase) {
        const parsed = this.audio.parseChord(chordStr);
        if (!parsed) return null;

        const rootIdx = window.musicTheory.getNoteIndex(parsed.root);
        const intervals = [0, 4, 7]; // Simplificado p/ Tríade
        if (parsed.suffix.includes('m')) intervals[1] = 3;
        if (parsed.suffix.includes('dim') || parsed.suffix.includes('°')) { intervals[1] = 3; intervals[2] = 6; }
        if (parsed.suffix.includes('aug') || parsed.suffix.includes('+')) { intervals[2] = 8; }

        const bassStr = this.audio.normalizeNoteForFile(parsed.bass);
        const n1 = this.audio.normalizeNoteForFile(window.musicTheory.sharpNotes[(rootIdx + intervals[0]) % 12]);
        const n2 = this.audio.normalizeNoteForFile(window.musicTheory.sharpNotes[(rootIdx + intervals[1]) % 12]);
        const n3 = this.audio.normalizeNoteForFile(window.musicTheory.sharpNotes[(rootIdx + intervals[2]) % 12]);

        let files = {};
        files[1] = `orgao_${bassStr}2.ogg`;
        files[2] = `orgao_${bassStr}${phase === 3 ? 4 : 3}.ogg`;
        files[3] = `orgao_${n1}${phase === 3 ? 5 : 4}.ogg`;
        files[4] = `orgao_${n2}${phase === 3 ? 5 : 4}.ogg`;
        files[5] = `orgao_${n3}${phase === 3 ? 5 : 4}.ogg`;

        return files;
    }

    // ============================================
    // EDITOR VISUAL
    // ============================================
    initUI() {
        const switchBtn = document.getElementById('toggle-rhythm-editor');
        const editorPanel = document.getElementById('rhythm-editor-panel');
        const mainDisplay = document.getElementById('main-display');
        const iframeDisplay = document.getElementById('main-iframe');

        const rhythmSelect = document.getElementById('rhythm-select');
        const organBtn = document.querySelector('[data-i18n="organ"]');

        if (switchBtn) {
            switchBtn.addEventListener('change', (e) => {
                if (e.target.checked) {
                    mainDisplay.classList.add('d-none');
                    iframeDisplay.classList.add('d-none');
                    editorPanel.classList.remove('d-none');
                    editorPanel.classList.add('d-flex');
                    this.drawGrid();
                } else {
                    editorPanel.classList.add('d-none');
                    editorPanel.classList.remove('d-flex');
                    mainDisplay.classList.remove('d-none');
                }
            });
        }

        if (rhythmSelect) {
            rhythmSelect.addEventListener('change', async (e) => {
                const val = e.target.value;

                if (val !== "none" && !this.audio.isStudioOrganPreloaded) {
                    rhythmSelect.disabled = true;
                    if (organBtn) organBtn.disabled = true;
                    rhythmSelect.classList.add('music-ui-blocked');
                    if (organBtn) organBtn.classList.add('music-ui-blocked');

                    await this.audio.preloadStudioOrgan();

                    rhythmSelect.disabled = false;
                    if (organBtn) organBtn.disabled = false;
                    rhythmSelect.classList.remove('music-ui-blocked');
                    if (organBtn) organBtn.classList.remove('music-ui-blocked');
                }
            });
        }

        const stepsInput = document.getElementById('rhythm-steps-input');
        const btnSave = document.getElementById('btn-save-rhythm');
        const btnExport = document.getElementById('btn-export-rhythm');

        if (stepsInput) stepsInput.addEventListener('change', (e) => {
            this.draftRhythm.steps = Math.max(1, parseInt(e.target.value) || 4);
            this.drawGrid();
        });

        if (btnSave) btnSave.addEventListener('click', () => {
            localStorage.setItem('rhythm_draft', JSON.stringify(this.draftRhythm));
            this.populateSelect();
            document.getElementById('rhythm-select').value = "rascunho";
            alert("Rascunho de ritmo salvo localmente!");
        });

        // Exporta exatamente na estrutura original do styles-melody.json
        if (btnExport) btnExport.addEventListener('click', () => {
            const exportObject = {};
            exportObject[this.currentInstrument] = {
                "custom": {
                    "numSteps": this.draftRhythm.steps,
                    "vozes": [
                        this.draftRhythm.v1,
                        this.draftRhythm.v2,
                        this.draftRhythm.v3,
                        this.draftRhythm.v4,
                        this.draftRhythm.v5
                    ]
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
            const node = document.createElement('a');
            node.setAttribute("href", dataStr);
            node.setAttribute("download", "styles-melody.json");
            document.body.appendChild(node);
            node.click();
            node.remove();
        });
    }

    loadDraft() {
        const saved = localStorage.getItem('rhythm_draft');
        if (saved) return JSON.parse(saved);

        return {
            id: "rascunho", name: "Rascunho Atual", steps: 8,
            v1: [0, 0, 0, 0, 0, 0, 0, 0],
            v2: [0, 0, 0, 0, 0, 0, 0, 0],
            v3: [0, 0, 0, 0, 0, 0, 0, 0],
            v4: [0, 0, 0, 0, 0, 0, 0, 0],
            v5: [0, 0, 0, 0, 0, 0, 0, 0]
        };
    }

    drawGrid() {
        const grid = document.getElementById('rhythm-grid');
        if (!grid) return;
        grid.innerHTML = '';
        document.getElementById('rhythm-steps-input').value = this.draftRhythm.steps;

        for (let i = 5; i >= 1; i--) {
            const row = document.createElement('div');
            row.className = 'rhythm-row';

            const label = document.createElement('div');
            label.className = 'rhythm-label';
            label.innerText = `Voz ${i}`;
            row.appendChild(label);

            const arr = this.draftRhythm[`v${i}`];

            while (arr.length < this.draftRhythm.steps) arr.push(0);
            if (arr.length > this.draftRhythm.steps) arr.length = this.draftRhythm.steps;

            for (let step = 0; step < this.draftRhythm.steps; step++) {
                const btn = document.createElement('div');
                btn.className = 'rhythm-step';
                btn.id = `step-ui-v${i}-s${step}`;
                btn.setAttribute('data-state', arr[step]);

                btn.onclick = () => {
                    let state = parseInt(btn.getAttribute('data-state'));
                    state = (state + 1) % 3; // Ciclo: 0 (Off) -> 1 (100%) -> 2 (50%) -> 0
                    btn.setAttribute('data-state', state);
                    arr[step] = state;
                };
                row.appendChild(btn);
            }
            grid.appendChild(row);
        }
    }

    highlightGridStep(stepIdx) {
        document.querySelectorAll('.rhythm-step').forEach(el => el.classList.remove('active-step'));
        for (let i = 1; i <= 5; i++) {
            const btn = document.getElementById(`step-ui-v${i}-s${stepIdx}`);
            if (btn) btn.classList.add('active-step');
        }
    }
}