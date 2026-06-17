class PianoSynthesizer {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.instrument = 'flauta';
        this.volume = 0.6;

        this.activeGain = null;
        this.activeOscillators = [];
    }

    setInstrument(inst) {
        this.instrument = inst;
    }

    getFrequency(pitch) {
        const parts = pitch.toLowerCase().split('/');
        if (parts.length !== 2) return 440;

        let nota = parts[0];
        let oitava = parseInt(parts[1], 10);

        const mapaNotas = {
            'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6, 'gb': 6, 'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11
        };

        let numNota = mapaNotas[nota];
        if (numNota === undefined) return 440;

        return 440 * Math.pow(2, ((oitava + 1) * 12 + numNota - 69) / 12);
    }

    // Corta a nota IMEDIATAMENTE (usado quando você desliza o dedo de uma nota pra outra)
    cutNote(t) {
        if (this.activeGain) {
            this.activeGain.gain.cancelScheduledValues(t);
            this.activeGain.gain.setTargetAtTime(0, t, 0.01);
        }
        if (this.activeOscillators.length > 0) {
            this.activeOscillators.forEach(osc => {
                try { osc.stop(t + 0.1); } catch (e) { }
            });
        }
        this.activeOscillators = [];
        this.activeGain = null;
    }

    // Morre SUAVEMENTE (usado quando você levanta o dedo do teclado)
    releaseNote() {
        if (!this.activeGain || !this.ctx) return;
        const t = this.ctx.currentTime;

        this.activeGain.gain.cancelScheduledValues(t);
        this.activeGain.gain.setValueAtTime(this.activeGain.gain.value, t);

        // Tempo que leva para o som morrer após soltar a tecla (Fade out)
        this.activeGain.gain.setTargetAtTime(0, t, 0.15);

        if (this.activeOscillators.length > 0) {
            this.activeOscillators.forEach(osc => {
                try { osc.stop(t + 1.0); } catch (e) { }
            });
        }
        this.activeGain = null;
        this.activeOscillators = [];
    }

    // INICIA a nota e segura (Sustain infinito até soltar)
    startNote(pitch) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const freq = this.getFrequency(pitch);
        const t = this.ctx.currentTime;

        this.cutNote(t);

        switch (this.instrument) {
            case 'epiano': this.playEPiano(freq, t); break;
            case 'flauta': this.playFlautaDoce(freq, t); break;
            case 'piano': default: this.playAcousticPiano(freq, t); break;
        }
    }

    playAcousticPiano(freq, t) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3 + 1000, t);
        filter.frequency.exponentialRampToValueAtTime(freq, t + 1.5);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(1, t + 0.01);
        // Piano decai naturalmente mesmo se segurar a tecla, mas bem devagar
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 6.0);

        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator(); osc1.type = 'triangle'; osc1.frequency.value = freq; osc1.connect(filter);
        const osc2 = this.ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = freq; osc2.connect(filter);

        osc1.start(t); osc2.start(t);
        this.activeGain = gainNode;
        this.activeOscillators = [osc1, osc2];
    }

    playEPiano(freq, t) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.8, t + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 6.0);

        gainNode.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = freq; osc1.connect(gainNode);
        const osc2 = this.ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = freq * 2;

        const gain2 = this.ctx.createGain(); gain2.gain.value = 0.15;
        osc2.connect(gain2); gain2.connect(gainNode);

        osc1.start(t); osc2.start(t);
        this.activeGain = gainNode;
        this.activeOscillators = [osc1, osc2];
    }

    playFlautaDoce(freq, t) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(this.volume, t + 0.1);
        // FLAUTA: Fica soprando infinitamente (Sustain) até soltar!
        gainNode.gain.setValueAtTime(this.volume, t + 999);

        gainNode.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = freq; osc1.connect(gainNode);
        const osc2 = this.ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = freq * 2;

        const gain2 = this.ctx.createGain(); gain2.gain.value = 0.05;
        osc2.connect(gain2); gain2.connect(gainNode);

        osc1.start(t); osc2.start(t);
        this.activeGain = gainNode;
        this.activeOscillators = [osc1, osc2];
    }
}