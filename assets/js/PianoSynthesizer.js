class PianoSynthesizer {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.instrument = 'flauta'; // Som padrão
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

        // Escolhe o gerador de som com base no instrumento selecionado
        switch (this.instrument) {
            case 'epiano':
                this.playEPiano(freq, t);
                break;
            case 'flauta':
                this.playFlauta(freq, t);
                break;
            case 'violao':
                this.playViolao(freq, t);
                break;
            case 'piano':
            default:
                this.playAcousticPiano(freq, t);
                break;
        }
    }

    // 1. PIANO ACÚSTICO (Onda Triângulo + Seno com Filtro Abafador)
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

    // 2. PIANO ELÉTRICO (Rhodes-like: Seno pura + Harmônico oitavado suave)
    playEPiano(freq, t) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.8, t + 0.02); // Ataque pouca coisa mais macio
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2); // Sustain longo que morre

        gainNode.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine'; // Corpo principal bem redondo
        osc1.frequency.value = freq;
        osc1.connect(gainNode);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2; // Harmônico (1 oitava acima) para dar brilho

        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0.15; // Bem baixo, só para colorir
        osc2.connect(gain2);
        gain2.connect(gainNode);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 3.5);
        osc2.stop(t + 3.5);
    }

    // 3. FLAUTA CURTA (Seno + Vibrato leve + Corta rápido)
    playFlauta(freq, t) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.7, t + 0.05); // Sopra (ataque mais lento)
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.2); // Morre rápido (pouco fôlego)

        gainNode.connect(this.ctx.destination);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;

        // Criando Vibrato (LFO - Low Frequency Oscillator)
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5; // Oscila 5 vezes por segundo

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = freq * 0.015; // Profundidade do vibrato

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency); // Conecta o LFO na afinação do oscilador 1

        osc1.connect(gainNode);

        osc1.start(t);
        lfo.start(t);
        osc1.stop(t + 1.5);
        lfo.stop(t + 1.5);
    }

    // 4. VIOLÃO / CORDAS DEDILHADAS (Onda Serra + Filtro Pluck)
    playViolao(freq, t) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // Começa com bastante harmônico (som da palheta) e corta bruscamente (som da corda)
        filter.frequency.setValueAtTime(freq * 4, t);
        filter.frequency.exponentialRampToValueAtTime(freq, t + 0.5);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.9, t + 0.01); // Ataque imediato
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2); // Abafa rápido

        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth'; // Onda dente de serra dá o tom vibrante da corda
        osc.frequency.value = freq;
        osc.connect(filter);

        osc.start(t);
        osc.stop(t + 2.5);
    }
}