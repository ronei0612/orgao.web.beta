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

		const startTime = (time != null && time > 0) ? time : this.audioContext.currentTime;
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

			// NOVO: Garante que o volume seja mantido no topo ATÉ o momento do stopTime
			// (Sem isso, o navegador pode cortar a nota abruptamente antes da hora)
			nodeEntry.gainNode.gain.setValueAtTime(nodeEntry.gainNode.gain.value, stopTime);

			// setTargetAtTime: Decaimento natural
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

    /**
	 * Carrega múltiplos buffers de áudio a partir de um mapa de URLs paralelamente.
	 * @param {Object<string, string|{url: string, volume: number}>} urlsMap Um objeto mapeando chaves para URLs ou objetos com URL e volume.
	 * @return {Promise<Map<string, AudioBuffer>>} Uma Promise que resolve para um Map de chaves e seus respectivos AudioBuffers.
	 * @see loadInstruments para um método mais específico de carregamento de instrumentos com configurações de volume.
	 * @throws {Error} Se ocorrer um erro durante o carregamento ou decodificação de um buffer, ele será registrado no console, mas não interromperá o processo de carregamento dos outros buffers.
	 * @returns {Promise<Map<string, AudioBuffer>>} Um Map contendo as chaves e seus respectivos AudioBuffers carregados com sucesso.
	 * */
	async loadBuffers(urlsMap) {
		// urlsMap: { chave: url } ou { chave: { url, volume } }
		const result = new Map();
		const promises = Object.entries(urlsMap).map(([key, value]) => {
			const url = typeof value === 'string' ? value : value.url;
			return fetch(url)
				.then(r => r.ok ? r.arrayBuffer() : null)
				.then(ab => ab ? this.audioContext.decodeAudioData(ab) : null)
				.then(buf => { if (buf) result.set(key, buf); })
				.catch(() => console.warn(`Buffer não carregado: ${key}`));
		});
		await Promise.all(promises);
		return result;
	}
}