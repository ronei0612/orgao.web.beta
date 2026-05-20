/**
 * Classe AudioContextManager
 * Responsável por gerenciar o Web Audio API, carregar instrumentos e tocar acordes
 * com efeitos de loop, attack e release.
 */
class AudioContextManager {
	constructor() {
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

		// CORREÇÃO ITEM 1: Criando a cadeia de processamento
		this.masterGain = this.audioContext.createGain();
		this.compressor = this.audioContext.createDynamicsCompressor();

		// Configuração recomendada para o compressor (evita distorção quando muitos sons tocam)
		this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
		this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
		this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
		this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
		this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

		// Roteamento: Master -> Compressor -> Saída Final (Destination)
		this.masterGain.connect(this.compressor);
		this.compressor.connect(this.audioContext.destination);

		this.buffers = {};
		this.instrumentSettings = {};
		this.gainNodes = [];
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
	 * Fábrica centralizada de sons. Cria o nó, conecta ao Compressor, previne "tics" e gerencia a memória.
	 * 
	 * @param {AudioBuffer} buffer O buffer de áudio a ser tocado.
	 * @param {number} time O momento (AudioContext.currentTime) em que o som deve iniciar.
	 * @param {number} volume O volume do som (0.0 a 1.0).
	 * @param {number} attack O tempo de ataque em segundos.
	 * @param {boolean} isLoop Se o som deve entrar em loop.
	 * @returns {Object|null} Retorna um objeto { source, gainNode } ou null se não houver buffer.
     * @param {Set} trackingSet (Opcional) Um Set onde a nota será adicionada e removida automaticamente.
	 */
	playNode(buffer, time, volume = 1, attack = 0.003, isLoop = false, trackingSet = null) {
		if (!buffer) return null;
		if (this.audioContext.state === 'suspended') this.audioContext.resume();

		const startTime = time || this.audioContext.currentTime;
		const source = this.audioContext.createBufferSource();
		const gainNode = this.audioContext.createGain();

		const safeAttack = Math.max(attack, 0.003);
		gainNode.gain.setValueAtTime(0, startTime);
		gainNode.gain.linearRampToValueAtTime(volume, startTime + safeAttack);

		source.buffer = buffer;
		source.loop = isLoop;
		source.connect(gainNode);
		gainNode.connect(this.masterGain);

		const nodeEntry = { source, gainNode };

		// Se um Set de rastreamento foi passado, adiciona a nota agora
		if (trackingSet) {
			trackingSet.add(nodeEntry);
		}

		source.start(startTime);

		source.onended = () => {
			// Lógica de limpeza centralizada:
			// 1. Remove do Set de rastreamento (se existir)
			if (trackingSet) {
				trackingSet.delete(nodeEntry);
			}

			// 2. Limpeza física do Web Audio
			source.disconnect();
			gainNode.disconnect();
		};

		return nodeEntry;
	}

	/**
	 * Para um nó de áudio suavemente (Fade-out exponencial natural)
	 * 
	 * @param {Object} nodeEntry O objeto { source, gainNode } retornado por playNode.
	 * @param {number} time O momento (AudioContext.currentTime) em que o som deve começar a parar.
	 * @param {number} release O tempo de cauda (fade-out) em segundos.
	 */
	stopNode(nodeEntry, time, release = 0.05) {
		if (!nodeEntry || !nodeEntry.gainNode || !nodeEntry.source) return;
		const stopTime = time || this.audioContext.currentTime;

		try {
			nodeEntry.gainNode.gain.cancelScheduledValues(stopTime);
			// setTargetAtTime: Decaimento natural (Bug #3)
			nodeEntry.gainNode.gain.setTargetAtTime(0, stopTime, release);

			// Para o nó após o decaimento (release * 5 é o tempo seguro para setTarget chegar a ~0)
			nodeEntry.source.stop(stopTime + (release * 5));
		} catch (e) {
			// Nó já estava parado
		}
	}

	/**
	 * Para um conjunto de notas (Set) de uma vez só.
	 * 
	 * @param {Set} nodesSet O Set contendo objetos { source, gainNode }.
	 * @param {number} release O tempo de fade-out em segundos.
	 */
	stopAll(nodesSet, release = 0.05, time = null) { // Adiciona parâmetro time
		if (!nodesSet || nodesSet.size === 0) return;

		// Se um tempo for fornecido, usa ele. Senão, usa o currentTime.
		const stopTime = time || this.audioContext.currentTime;
		const toStop = [...nodesSet];

		toStop.forEach(node => {
			this.stopNode(node, stopTime, release); // Passa o stopTime adiante
		});
	}
}