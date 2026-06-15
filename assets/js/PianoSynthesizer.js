class PianoSynthesizer {
    constructor(audioContext) {
        this.ctx = audioContext;
        // Você pode mudar manualmente aqui no código para: 'piano', 'epiano' ou 'flauta'
        this.instrument = 'flauta';
        this.volume = 0.5;
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

        let midi = (oitava + 1) * 12 + numNota;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    playNote(pitch) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const freq = this.getFrequency(pitch);
        const t = this.ctx.currentTime;

        // Roteamento baseado na escolha do instrumento
        switch (this.instrument) {
            case 'epiano':
                this.playEPiano(freq, t);
                break;
            case 'flauta':
                this.playFlautaDoce(freq, t);
                break;
            case 'piano':
            default:
                this.playAcousticPiano(freq, t);
                break;
        }
    }

    // 1. PIANO ACÚSTICO
    playAcousticPiano(freq, t) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3 + 1000, t);
        filter.frequency.exponentialRampToValueAtTime(freq, t + 1.5);
        filter.Q.value = 0.5;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(1, t + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = freq;
        osc1.connect(filter);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq;
        osc2.connect(filter);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 3);
        osc2.stop(t + 3);
    }

    // 2. PIANO ELÉTRICO
    playEPiano(freq, t) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.8, t + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 3);

        gainNode.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        osc1.connect(gainNode);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;

        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0.15;
        osc2.connect(gain2);
        gain2.connect(gainNode);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 3.5);
        osc2.stop(t + 3.5);
    }

    // 3. FLAUTA DOCE (Som puro, doce e sem oco prolongado)
    playFlautaDoce(freq, t) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        // Sopra suavemente, mas rápido
        gainNode.gain.linearRampToValueAtTime(this.volume, t + 0.1);
        // Morre de forma natural e rápida
        gainNode.gain.setTargetAtTime(0, t + 0.2, 0.2);

        gainNode.connect(this.ctx.destination);

        // Onda principal (Seno puro)
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        osc1.connect(gainNode);

        // Onda secundária (Triângulo bem fraquinho uma oitava acima simula a ressonância do tubo)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;

        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0.05; // Bem sutil
        osc2.connect(gain2);
        gain2.connect(gainNode);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 1.0);
        osc2.stop(t + 1.0);
    }
}