class PianoSynthesizer {
    constructor(audioContext) {
        this.ctx = audioContext;
    }

    // Converte a nota (ex: "c/4", "f#/5") para Frequência em Hertz
    getFrequency(pitch) {
        const parts = pitch.toLowerCase().split('/');
        if (parts.length !== 2) return 440; // Default (Lá)

        let nota = parts[0];
        let oitava = parseInt(parts[1], 10);

        const mapaNotas = {
            'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6, 'gb': 6, 'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11
        };

        let numNota = mapaNotas[nota];
        if (numNota === undefined) return 440;

        // Fórmula padrão para calcular a frequência MIDI
        let midi = (oitava + 1) * 12 + numNota;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    playNote(pitch) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const freq = this.getFrequency(pitch);
        const t = this.ctx.currentTime;

        // Filtro passa-baixa (Simula a percussão inicial e depois abafa o som)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3 + 1000, t); // Abre brilhante
        filter.frequency.exponentialRampToValueAtTime(freq, t + 1.5); // Fecha rápido
        filter.Q.value = 0.5;

        // Envelope de Volume (ADSR) para o "Decay" do Piano
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(1, t + 0.01); // Ataque rápido do martelo
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2.5); // Decaimento natural

        // Conecta as saídas
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Oscilador 1 (Corpo do som - Triangle Wave)
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = freq;
        osc1.connect(filter);

        // Oscilador 2 (Ressonância / Brilho Metálico - Sine Wave)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq;
        osc2.connect(filter);

        // Dispara e para os osciladores
        osc1.start(t);
        osc2.start(t);

        osc1.stop(t + 3);
        osc2.stop(t + 3);
    }
}