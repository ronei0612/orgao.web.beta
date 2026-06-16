class PianoSynthesizer {
    constructor(audioContext) {
        this.ctx = audioContext;
        // Você pode mudar manualmente aqui no código para: 'piano', 'epiano' ou 'flauta'
        this.instrument = 'flauta';
        this.volume = 0.6;

        // Variáveis para guardar a nota atual e permitir que toque uma por vez
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

        let midi = (oitava + 1) * 12 + numNota;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // Método novo para cortar a nota anterior suavemente (evita estalos)
    stopCurrentNote(t) {
        if (this.activeGain) {
            this.activeGain.gain.cancelScheduledValues(t);
            // Faz um fade-out ultra rápido (30ms) na nota antiga
            this.activeGain.gain.setTargetAtTime(0, t, 0.03);
        }
        if (this.activeOscillators && this.activeOscillators.length > 0) {
            this.activeOscillators.forEach(osc => {
                try { osc.stop(t + 0.1); } catch (e) { }
            });
        }

        // Limpa o registro
        this.activeOscillators = [];
        this.activeGain = null;
    }

    playNote(pitch) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const freq = this.getFrequency(pitch);
        const t = this.ctx.currentTime;

        // CORTA A NOTA ANTERIOR ANTES DE TOCAR A NOVA
        this.stopCurrentNote(t);

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

        // Salva os nós para poder interromper
        this.activeGain = gainNode;
        this.activeOscillators = [osc1, osc2];
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

        // Salva os nós para poder interromper
        this.activeGain = gainNode;
        this.activeOscillators = [osc1, osc2];
    }

    // 3. FLAUTA DOCE
    playFlautaDoce(freq, t) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);

        // Ataque: Sopra suavemente
        gainNode.gain.linearRampToValueAtTime(this.volume, t + 0.1);

        // SUSTAIN AUMENTADO: Segura a nota no volume máximo por 1.5 segundos
        gainNode.gain.setValueAtTime(this.volume, t + 1.0);

        // DECAY: Começa a morrer suavemente só depois de 1.5s
        gainNode.gain.setTargetAtTime(0, t + 1.0, 0.4);

        gainNode.connect(this.ctx.destination);

        // Onda principal
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        osc1.connect(gainNode);

        // Onda secundária (ressonância do tubo)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;

        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0.05;
        osc2.connect(gain2);
        gain2.connect(gainNode);

        osc1.start(t);
        osc2.start(t);

        // Aumenta o tempo limite de vida dos osciladores para acompanhar o novo sustain
        osc1.stop(t + 4.0);
        osc2.stop(t + 4.0);

        // Salva os nós para poder interromper se outra tecla for apertada
        this.activeGain = gainNode;
        this.activeOscillators = [osc1, osc2];
    }
}