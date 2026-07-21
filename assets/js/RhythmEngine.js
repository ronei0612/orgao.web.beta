class RhythmEngine {
    constructor(toolbar, audioManager) {
        this.toolbar = toolbar;
        this.audio = audioManager;

        this.rawRhythms = {};
        this.currentInstrument = "orgao";

        this.draftRhythm = this.loadDraft();
        this.isPlayingRhythm = false;
        this.currentStep = 0;
        this.nextStepTime = 0;
        this.nextBlinkTime = 0;

        this.currentVoicesFiles = null;

        this.initUI();
        this.startEngineLoop();
    }

    async init() {
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

        await this.audio.preloadAll();

        this.setMusicLoadingState(false);
        this.populateSelect();
        this.nextBlinkTime = this.audio.ctx.currentTime;
    }

    setMusicLoadingState(isLoading) {
        const elementsToBlock = [
            document.getElementById('key-select')?.closest('.input-group'),
            document.getElementById('bpm-input')?.closest('.input-group'),
            document.getElementById('rhythm-select')?.closest('.input-group'),
            document.getElementById('btn-play'),
            document.getElementById('btn-action-toggle'),
            document.querySelector('.piano-wrapper'),
            document.getElementById('chord-degrees-panel')
        ];

        elementsToBlock.forEach(el => {
            if (el) {
                if (isLoading) el.classList.add('music-ui-blocked');
                else el.classList.remove('music-ui-blocked');
            }
        });
    }

    // Modal Instrument Change Event
    async changeInstrument(inst) {
        this.currentInstrument = inst;

        const btn = document.getElementById('btn-instrument-select');
        if (btn) btn.innerText = inst === 'piano' ? 'PIANO' : 'ÓRGÃO';

        this.populateSelect();

        const select = document.getElementById('rhythm-select');
        if (select) {
            select.value = "none";
            select.dispatchEvent(new Event('change'));
        }

        const isPreloaded = inst === 'piano' ? this.audio.isStudioPianoPreloaded : this.audio.isStudioOrganPreloaded;
        if (!isPreloaded) {
            this.setMusicLoadingState(true);
            await this.audio.preloadStudioInstrument(inst);
            this.setMusicLoadingState(false);
        }
    }

    populateSelect() {
        const select = document.getElementById('rhythm-select');
        if (!select) return;
        select.innerHTML = '<option value="none">Sem ritmo</option>';

        if (localStorage.getItem('rhythm_draft')) {
            select.innerHTML += '<option value="rascunho">📝 Meu Rascunho</option>';
        }

        const instrumentRhythms = this.rawRhythms[this.currentInstrument];
        if (instrumentRhythms) {
            // Ordenação Matemática Perfeita
            const sortedKeys = Object.keys(instrumentRhythms).sort((a, b) => {
                const [numA, denA] = a.split('/').map(Number);
                const [numB, denB] = b.split('/').map(Number);
                if (denA !== denB) return denA - denB;
                return numA - numB;
            });

            sortedKeys.forEach(timeSig => {
                select.innerHTML += `<option value="${timeSig}">${timeSig}</option>`;
            });
        }
    }

    // Carrega do Banco JSON direto pra Grade do Usuário, impedindo Mutação de Variável
    loadRhythmIntoDraft(val) {
        if (val === "rascunho") {
            this.draftRhythm = this.loadDraft();
            return;
        }

        const rawData = this.rawRhythms[this.currentInstrument]?.[val];
        if (rawData) {
            this.draftRhythm = {
                id: val,
                name: val,
                steps: rawData.numSteps || rawData.steps || 8,
                // INVERTIDO PARA BATER COM A INTERFACE E O SEU JSON:
                v5: [...(rawData.vozes ? rawData.vozes[0] : (rawData.v5 || []))],
                v4: [...(rawData.vozes ? rawData.vozes[1] : (rawData.v4 || []))],
                v3: [...(rawData.vozes ? rawData.vozes[2] : (rawData.v3 || []))],
                v2: [...(rawData.vozes ? rawData.vozes[3] : (rawData.v2 || []))],
                v1: [...(rawData.vozes ? rawData.vozes[4] : (rawData.v1 || []))]
            };
        }
    }

    stop() {
        this.isPlayingRhythm = false;
        this.clearGridHighlight(); // Remove as luzinhas perdidas
        this.audio.stopRhythmNotes(); // Corta os áudios do ritmo com o release de 0.2s
    }

    // ============================================
    // MOTOR DE REPRODUÇÃO & METRÔNOMO
    // ============================================
    startEngineLoop() {
        const scheduler = () => {
            const now = this.audio.ctx.currentTime;
            const beatDuration = 60.0 / this.toolbar.getBpm(); // Mantém o pulso do metrônomo (Semínima)
            const stepDuration = beatDuration / 2;             // Dobra a velocidade do ritmo (Colcheia)

            const rhythmSelect = document.getElementById('rhythm-select');
            const hasRhythmSelected = rhythmSelect && rhythmSelect.value !== "none";

            // Metrônomo (Piscar)
            if (now >= this.nextBlinkTime) {
                this.nextBlinkTime += beatDuration;
                if (hasRhythmSelected) {
                    const btnPlay = document.getElementById('btn-play');
                    if (btnPlay) {
                        btnPlay.classList.add('bpm-blink');
                        setTimeout(() => btnPlay.classList.remove('bpm-blink'), 120);
                    }
                }
            }

            // Sync-Start usando Diretamente a Grade (draftRhythm)
            if (this.isPlayingRhythm && this.currentVoicesFiles) {
                const lookahead = 0.1;
                while (this.nextStepTime < now + lookahead) {
                    this.scheduleStep(this.currentStep, this.nextStepTime);

                    const stepToAnimate = this.currentStep;
                    const timeToAnimate = this.nextStepTime - now;
                    setTimeout(() => this.highlightGridStep(stepToAnimate), timeToAnimate * 1000);

                    this.nextStepTime += stepDuration;
                    this.currentStep++;

                    // Substitua o IF antigo por este:
                    if (this.currentStep >= this.draftRhythm.steps) {
                        this.isPlayingRhythm = false;

                        // Apaga a luzinha da tela no momento exato em que a última batida terminar
                        const timeToAnimate = this.nextStepTime - now;
                        setTimeout(() => this.clearGridHighlight(), timeToAnimate * 1000);
                        break;
                    }
                }
            }
            requestAnimationFrame(scheduler);
        };
        requestAnimationFrame(scheduler);
    }

    scheduleStep(stepIndex, time) {
        for (let i = 1; i <= 5; i++) {
            const track = this.draftRhythm[`v${i}`];
            if (!track || track.length <= stepIndex) continue;

            const state = track[stepIndex];
            if (state > 0) {
                const fileName = this.currentVoicesFiles[i];
                if (fileName) {
                    const vol = state === 1 ? 1.0 : 0.5;
                    this.audio.playStudioNote(this.currentInstrument, fileName, vol, time);
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

        // Final da função triggerChord
        this.currentVoicesFiles = this.calculateVoicesFiles(chordStr, phase);

        this.audio.stopRhythmNotes(); // NOVO: Corta suavemente o ritmo do acorde anterior

        this.currentStep = 0;
        this.nextStepTime = this.audio.ctx.currentTime + 0.02;
        this.isPlayingRhythm = true;
    }

    calculateVoicesFiles(chordStr, phase) {
        const parsed = this.audio.parseChord(chordStr);
        if (!parsed) return null;

        const rootIdx = window.musicTheory.getNoteIndex(parsed.root);

        // Intervalos: 0 (Fundamental), 1 (Terça), 2 (Quinta)
        const intervals = [0, 4, 7];
        if (parsed.suffix.includes('m')) intervals[1] = 3;
        if (parsed.suffix.includes('dim') || parsed.suffix.includes('°')) { intervals[1] = 3; intervals[2] = 6; }
        if (parsed.suffix.includes('aug') || parsed.suffix.includes('+')) { intervals[2] = 8; }

        const bassStr = this.audio.normalizeNoteForFile(parsed.bass);
        const prefix = this.currentInstrument === 'piano' ? 'piano' : 'orgao';

        // HELPER MATEMÁTICO (CORREÇÃO DO BUG): 
        // Garante que a terça e a quinta subam de oitava corretamente quando cruzam a nota Dó.
        const getNote = (intervalIdx, baseOctave) => {
            let absSemi = rootIdx + intervals[intervalIdx];
            let noteIdx = absSemi % 12;
            let octaveShift = Math.floor(absSemi / 12);
            let noteName = window.musicTheory.sharpNotes[noteIdx].toLowerCase().replace('#', '_');
            return `${prefix}_${noteName}${baseOctave + octaveShift}.ogg`;
        };

        let files = {};

        // Vozes 1 e 2: Baixos graves (FIXOS na oitava 2 e 3)
        files[1] = `${prefix}_${bassStr}2.ogg`;
        files[2] = `${prefix}_${bassStr}3.ogg`;

        if (this.currentInstrument === 'piano') {
            // ============================================
            // REGRA ESPECIAL DO PIANO
            // ============================================
            if (phase === 3) {
                // Modo Cheio
                files[3] = getNote(0, 4); // Fundamental 4
                files[4] = getNote(1, 4); // Terça 4
                // Pianada: Tríade completa junta na Voz 5
                files[5] = [getNote(0, 4), getNote(1, 4), getNote(2, 4)];
            } else {
                // Modo Normal
                files[3] = getNote(1, 3); // Terça 3
                files[4] = getNote(2, 3); // Quinta 3
                // Pianada: Inversão (Terça, Quinta, Fundamental)
                files[5] = [getNote(1, 3), getNote(2, 3), getNote(0, 4)];
            }
        } else {
            // ============================================
            // COMPORTAMENTO PADRÃO (ÓRGÃO)
            // ============================================
            if (phase === 3) {
                // Modo Cheio: Fundamental (8ª 4), Terça (8ª 4), Quinta (8ª 4)
                files[3] = getNote(0, 4);
                files[4] = getNote(1, 4);
                files[5] = getNote(2, 4);
            } else {
                // Modo Normal: Terça (8ª 3), Quinta (8ª 3), Fundamental (8ª 4)
                files[3] = getNote(1, 3);
                files[4] = getNote(2, 3);
                files[5] = getNote(0, 4);
            }
        }

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

                if (val !== "none") {
                    this.loadRhythmIntoDraft(val);
                    this.drawGrid();
                }

                // Ao escolher um ritmo, carrega o instrumento (Se for a 1º Vez)
                const isPreloaded = this.currentInstrument === 'piano' ? this.audio.isStudioPianoPreloaded : this.audio.isStudioOrganPreloaded;
                if (val !== "none" && !isPreloaded) {
                    const chordPanel = document.getElementById('chord-degrees-panel');
                    const organBtn = document.getElementById('btn-instrument-select');

                    rhythmSelect.disabled = true;
                    if (organBtn) organBtn.disabled = true;

                    rhythmSelect.classList.add('music-ui-blocked');
                    if (organBtn) organBtn.classList.add('music-ui-blocked');
                    if (chordPanel) chordPanel.classList.add('music-ui-blocked');

                    await this.audio.preloadStudioInstrument(this.currentInstrument);

                    rhythmSelect.disabled = false;
                    if (organBtn) organBtn.disabled = false;

                    rhythmSelect.classList.remove('music-ui-blocked');
                    if (organBtn) organBtn.classList.remove('music-ui-blocked');
                    if (chordPanel) chordPanel.classList.remove('music-ui-blocked');
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

        if (btnExport) btnExport.addEventListener('click', () => {
            const exportObject = {};
            exportObject[this.currentInstrument] = {
                "custom": {
                    "numSteps": this.draftRhythm.steps,
                    "vozes": [
                        this.draftRhythm.v5, // Exporta de cima para baixo
                        this.draftRhythm.v4,
                        this.draftRhythm.v3,
                        this.draftRhythm.v2,
                        this.draftRhythm.v1
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
                    state = (state + 1) % 3;
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

    clearGridHighlight() {
        document.querySelectorAll('.rhythm-step').forEach(el => el.classList.remove('active-step'));
    }
}