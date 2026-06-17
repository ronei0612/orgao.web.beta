class TonePianoManager {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.isLoaded = false;
        this.sampler = null;
    }

    async init() {
        if (this.isLoaded) return;

        // Sincroniza o Tone.js com o AudioContext nativo do seu app
        Tone.setContext(this.audioManager.audioContext);
        await Tone.start();

        return new Promise((resolve) => {
            // Carrega um pacote otimizado de notas do Salamander Piano
            this.sampler = new Tone.Sampler({
                urls: {
                    "C3": "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", "A3": "A3.mp3",
                    "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", "A4": "A4.mp3",
                    "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", "A5": "A5.mp3"
                },
                release: 1.5,
                baseUrl: "https://tonejs.github.io/audio/salamander/",
                onload: () => {
                    this.isLoaded = true;
                    // Conecta a saída do piano no compressor do seu app
                    Tone.connect(this.sampler, this.audioManager.masterGain);
                    resolve();
                }
            });
        });
    }

    stopAll(time) {
        if (!this.isLoaded) return;
        this.sampler.releaseAll(time);
    }

    playNoteAttack(pitch, time, velocity = 0.8) {
        if (!this.isLoaded) return;
        this.sampler.triggerAttack(pitch, time, velocity);
    }

    playNoteAttackRelease(pitch, duration, time, velocity = 0.8) {
        if (!this.isLoaded) return;
        this.sampler.triggerAttackRelease(pitch, duration, time, velocity);
    }
}