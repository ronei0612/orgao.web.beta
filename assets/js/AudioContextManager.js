/**
 * Classe AudioContextManager
 * Responsável por gerenciar o Web Audio API, carregar instrumentos e tocar acordes
 * com efeitos de loop, attack e release.
 */
class AudioContextManager {
	constructor() {
		// Cria uma nova instância do AudioContext
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		this.buffers = {}; // Armazena os buffers de áudio carregados (instrumentos)
		this.instrumentSettings = {};
		this.sources = []; // Armazena os nós de fonte de áudio atualmente tocando
		this.gainNodes = []; // Armazena os nós de ganho (volume) para controle de Attack/Release
		this.currentNotes = []; // Notas a serem tocadas (setadas pelo setNotes)
		// O this.notesMap foi removido do construtor e será passado para loadInstruments()
	}

	/**
	 * Carrega todos os instrumentos (arquivos de áudio) na memória (buffers).
	 * @param {Object<string, {url: string, volume: number}>} urlsMap Um objeto mapeando o nome da nota para um objeto com a URL e o volume desejado (0.0 a 1.0).
	 * @returns {Promise<void>} Uma Promise que resolve quando todos os arquivos são carregados.
	 */
	async loadInstruments(urlsMap) {
		const noteKeys = Object.keys(urlsMap);

		// Limpa buffers e configurações anteriores
		this.buffers = {};
		this.instrumentSettings = {};

		const loadingPromises = noteKeys.map(key => {
			const { url, volume = 1 } = urlsMap[key];
			this.instrumentSettings[key] = { volume };

			return fetch(url)
				.then(response => {
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status} for ${url}`);
					}
					return response.arrayBuffer();
				})
				.then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
				.then(audioBuffer => {
					this.buffers[key] = audioBuffer;
				})
				.catch(error => {
					console.error(`Erro ao carregar ${key} (URL: ${url}): ${error}`);
				});
		});

		await Promise.all(loadingPromises);
	}

	/**
	 * Define as notas que serão tocadas no próximo método play().
	 * @param {string[]} notes Um array de strings com as notas, ex: ['c', 'e', 'g'].
	 */
	setNotes(notes) {
		this.currentNotes = notes;
	}

	/**
	 * Adiciona notas ao conjunto currentNotes.
	 * @param {string[]} notes Um array de strings com as notas a serem adicionadas.
	 */
	addNotes(notes) {
		this.currentNotes = Array.from(new Set([...this.currentNotes, ...notes]));
	}

	/**
	 * Toca as notas definidas em currentNotes.
	 * Lógica alterada para diferenciar Loop de Strings e Órgão.
	 */
	play(attackTime = 0.2) {
		// Garante que o AudioContext esteja resumido
		if (this.audioContext.state === 'suspended') {
			this.audioContext.resume();
		}

		// Para o som anterior
		this.stop(0.2);

		const now = this.audioContext.currentTime;

		this.currentNotes.forEach(note => {
			if (!this.buffers[note]) return;

			const source = this.audioContext.createBufferSource();
			const gainNode = this.audioContext.createGain();
			const settings = this.instrumentSettings[note] || { volume: 1 };

			source.buffer = this.buffers[note];

			source.loop = !note.startsWith('epiano');

			source.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			// Efeito Attack
			gainNode.gain.setValueAtTime(0, now);
			gainNode.gain.linearRampToValueAtTime(settings.volume, now + attackTime);

			source.start(now);

			// Adiciona propriedade customizada para facilitar limpeza
			source.gainNodeRef = gainNode;

			this.sources.push(source);
		});
	}

	/**
	 * Para as notas que estão tocando com efeito Release.
	 * @param {number} [releaseTime=0.2] Duração do efeito Release em segundos (saída suave).
	 */
	stop(releaseTime = 0.2) {
		if (this.sources.length === 0) return;
		const now = this.audioContext.currentTime;
		const stopTime = now + releaseTime;

		// Movemos os sources atuais para uma variável local para limpar o array da classe
		const oldSources = [...this.sources];
		this.sources = [];

		oldSources.forEach(source => {
			const gainNode = source.gainNodeRef;

			// Release suave
			gainNode.gain.cancelScheduledValues(now);
			gainNode.gain.setValueAtTime(gainNode.gain.value, now);
			gainNode.gain.linearRampToValueAtTime(0, stopTime);

			source.stop(stopTime);

			// GARANTIA DE LIMPEZA DE MEMÓRIA:
			// Agenda a desconexão para quando o som terminar
			setTimeout(() => {
				source.disconnect();
				gainNode.disconnect();
			}, releaseTime * 1000 + 100);
		});
	}
}