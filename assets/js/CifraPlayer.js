class CifraPlayer {
    constructor(elements, uiController, musicTheory, baseUrl, audioManager) {
        this.audioPath = `${baseUrl}/assets/audio/`;
        this.uiController = uiController;
        this.musicTheory = musicTheory;
        this.elements = elements;
        this.audioManager = audioManager;
        this.activeSources = new Set();

        this.acordeGroup = [];
        this.epianoGroup = [];
        this.tocarEpiano = false;
        this.parado = true;
        this.acordeTocando = '';
        this.acordeFull = false;
        this.indiceAcorde = 0;
        this.tomAtual = 'C';
        this.tomOriginal = null;
        this.elements_b = null;
        this.instrumento = 'orgao';
        this.attack = 0.2;
        this.release = 0.2;
        this.baixo = null;

        this.fatorVolumeStrings = 1.25;

        this.loadSounds();
        this.epianoLoaded = false;
    }

    /**
     * Descobre o tom da música a partir do HTML fornecido.
     * @param {string} textoHtml - O conteúdo HTML da música.
     * @returns {string} - O tom descoberto ou uma string vazia se não for possível determinar.
     */
    descobrirTom(textoHtml) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = textoHtml;
        const cifrasTag = tempDiv.querySelectorAll('b');
        if (!cifrasTag.length) return '';
        const cifras = Array.from(cifrasTag).map(b => b.innerText.split('/')[0]).filter(c => c);

        return this.musicTheory.descobrirTom(cifras);
    }

    /**
     * Remove tags HTML do texto da cifra.
     * @param {string} texto - O texto da cifra com possíveis tags HTML.
     * @returns {string} - O texto da cifra sem tags HTML.
     */
    removerTagsDaCifra(texto) {
        if (texto) {
            if (texto.includes('<pre>')) {
                return texto.split('<pre>')[1].split('</pre>')[0].replace(/<\/?[^>]+(>|$)/g, "");
            }
            else {
                return texto;
            }
        }
        return '';
    }

    destacarCifras(texto, tom) {
        const textoAcordesCorrigidos = texto.replace('º', '°');
        const linhas = textoAcordesCorrigidos.split('\n');
        let cifraNum = 1;
        const temPalavra = /[a-zA-Z]{4,}/; // Não remover! Usar caso necessário
        const temColchetes = /\[.*?\]/;
        const temParenteses = /\(.*?\)/;
        var musicaCifrada = false;

        const linhasDestacadas = linhas.map(linha => {
            if (linha) {
                const acordes = linha.trim().split(/\s+/);
                const primeiroAcordePuro = acordes[0].split('(')[0].split('/')[0];
                const segundoAcordePuro = acordes[1]?.split('(')[0].split('/')[0];
                const ehLinhaDeAcordeUnico = acordes.length === 1 && this.musicTheory.notasAcordes.includes(primeiroAcordePuro);
                const ehLinhaDeAcordesConsecutivos = acordes.length >= 2 && this.musicTheory.notasAcordes.includes(primeiroAcordePuro) && this.musicTheory.notasAcordes.includes(segundoAcordePuro);
                const linhDeColcheteseAcordes = temColchetes.test(linha) && acordes.length >= 2 && this.musicTheory.notasAcordes.includes(segundoAcordePuro);
                const linhDeParenteseseAcordes = temParenteses.test(linha) && acordes.length >= 2 && (this.musicTheory.notasAcordes.includes(primeiroAcordePuro) || this.musicTheory.notasAcordes.includes(segundoAcordePuro));

                if (ehLinhaDeAcordeUnico || ehLinhaDeAcordesConsecutivos || linhDeColcheteseAcordes || linhDeParenteseseAcordes) {
                    let espacos = [''];
                    if (linha.startsWith(' ')) {
                        espacos = linha.match(/\s+/g);
                    } else {
                        espacos = espacos.concat(linha.match(/\s+/g) || []);
                    }
                    const linhaProcessada = acordes.map((palavra, index) => {
                        let acorde = this.processarAcorde(palavra, cifraNum, tom);
                        if (acorde.startsWith('<b'))
                            cifraNum++;

                        return espacos[index] + acorde;
                    }).join('');
                    if (cifraNum > 1) {
                        musicaCifrada = true;
                        return `<span><b></b>${linhaProcessada}<b></b></span>`;
                    }
                    else {
                        return `${linhaProcessada}`;
                    }
                }
            }
            return linha;
        });

        if (musicaCifrada) {
            return `<pre class="cifra">${linhasDestacadas.join('\n')}</pre>`;
        } else {
            return `<pre class="letra">${linhasDestacadas.join('\n')}</pre>`;
        }
    }

    processarAcorde(palavra, cifraNum, tom) {
        let acorde = palavra;
        let baixo = '';

        if (acorde.includes('/') && !acorde.includes('(')) {
            [acorde, baixo] = acorde.split('/');

            baixo = this.musicTheory.getAcorde(baixo, tom);

            while (!this.musicTheory.notasAcordes.includes(acorde) && acorde) {
                acorde = acorde.slice(0, -1);
            }

            acorde = this.musicTheory.getAcorde(acorde, tom);
            acorde = this.musicTheory.acordesSustenidosBemol.includes(baixo) ? `${acorde}/${baixo}` : palavra;
        } else {
            while (!this.musicTheory.notasAcordes.includes(acorde) && acorde) {
                acorde = acorde.slice(0, -1);
            }

            acorde = this.musicTheory.getAcorde(acorde, tom);
        }

        return this.musicTheory.notasAcordes.includes(acorde.split('/')[0]) ? `<b id="cifra${cifraNum}">${acorde}</b>` : palavra;
    }

    async loadSounds() {
        const urls = {};
        const instrumentos = ['orgao', 'strings'];
        const oitavas = ['grave', 'baixo', ''];

        instrumentos.forEach(instrumento => {
            this.musicTheory.notas.forEach(nota => {
                oitavas.forEach(oitava => {
                    const key = `${instrumento}_${nota}${oitava ? '_' + oitava : ''}`;
                    const path = `${this.audioPath}${instrumento.charAt(0).toUpperCase() + instrumento.slice(1)}/${key}.ogg`;

                    // O loadBuffers aceita string direta
                    urls[key] = path;
                });
            });
        });

        // Agora o CifraPlayer gerencia seu próprio Map de buffers!
        this.buffers = await this.audioManager.loadBuffers(urls);

        if (this.onInstrumentosCarregados) {
            this.onInstrumentosCarregados();
        }
    }

    async loadEpianoSounds() {
        if (this.epianoLoaded) return;

        const urls = {};
        const instrumento = 'epiano';
        const oitavas = ['grave', 'baixo', ''];

        this.musicTheory.notas.forEach(nota => {
            oitavas.forEach(oitava => {
                const key = `${instrumento}_${nota}${oitava ? '_' + oitava : ''}`;
                const path = `${this.audioPath}${instrumento.charAt(0).toUpperCase() + instrumento.slice(1)}/${key}.ogg`;
                urls[key] = path;
            });
        });

        const epianoBuffers = await this.audioManager.loadBuffers(urls);
        // Mescla no Map existente
        epianoBuffers.forEach((buf, key) => this.buffers.set(key, buf));
        this.epianoLoaded = true;
    }

    getVolumeForNote(notaKey) {
        // Volume base é 1.0 (máximo). Se for strings, divide pelo fator redutor.
        if (notaKey.startsWith('strings_')) {
            return 1.0 / this.fatorVolumeStrings;
        }
        return 1.0;
    }

    transposeCifra() {
        if (this.elements.tomSelect.value) {
            const novoTom = this.elements.tomSelect.value;
            this.transporCifraNoIframe(novoTom);
            this.tomAtual = novoTom;

            if (this.indiceAcorde > 0) {
                this.indiceAcorde--;
            }

            if (!this.parado && this.acordeTocando) {
                this.avancarCifra();
            }
        }
    }

    preencherAcordes(tom) {
        const acordeButtons = document.querySelectorAll('button[data-action="acorde"]');

        this.musicTheory.campoHarmonicoAcordes[tom].forEach((acorde, index) => {
            acordeButtons[index].value = acorde;
            acordeButtons[index].textContent = acorde;
        });
    }

    transporTom(novoTom) {
        const acordeButtons = document.querySelectorAll('button[data-action="acorde"]');

        const steps = this.musicTheory.tonsMaiores.indexOf(this.musicTheory.acordesMap[novoTom] ?? novoTom) - this.musicTheory.tonsMaiores.indexOf(this.musicTheory.acordesMap[this.tomAtual] ?? this.tomAtual);

        acordeButtons.forEach(acordeButton => {
            const antesAcorde = acordeButton.value;
            const antesAcordeSoNota = antesAcorde.replace('m', '').replace('°', '');

            let novoAcorde = this.musicTheory.transposeAcorde(antesAcordeSoNota, steps, novoTom);

            novoAcorde = antesAcorde.replace(antesAcordeSoNota, novoAcorde);
            acordeButton.value = novoAcorde;
            acordeButton.innerHTML = novoAcorde;
        });

        this.tomAtual = novoTom;

        if (this.indiceAcorde > 0) {
            this.indiceAcorde--;
        }
    }

    transporCifraNoIframe(novoTom) {
        let tons;
        if (this.musicTheory.tonsMaiores.includes(novoTom)) {
            tons = this.musicTheory.tonsMaiores;
        } else if (this.musicTheory.tonsMenores.includes(novoTom)) {
            tons = this.musicTheory.tonsMenores;
        }

        const steps = tons.indexOf(novoTom) - tons.indexOf(this.tomAtual);
        const cifras = this.elements.iframeCifra.contentDocument.querySelectorAll('b');

        for (const cifra of cifras) {
            let acorde = cifra.innerText;
            if (acorde) {
                const partes = acorde.split('/');
                let acordePrincipal = partes[0];

                while (!this.musicTheory.acordesSustenidos.includes(acordePrincipal) && !this.musicTheory.acordesBemol.includes(acordePrincipal) && acordePrincipal) {
                    acordePrincipal = this.musicTheory.acordesMap[acordePrincipal] || acordePrincipal.slice(0, -1);
                }

                let novoTomAcorde = this.musicTheory.transposeAcorde(acordePrincipal, steps, novoTom);
                let novoAcorde = partes[0].replace(acordePrincipal, novoTomAcorde);

                if (partes[1]) {
                    let acordeBaixo = partes[1];
                    while (!this.musicTheory.acordesSustenidos.includes(acordeBaixo) && !this.musicTheory.acordesBemol.includes(acordeBaixo) && acordeBaixo) {
                        acordeBaixo = this.musicTheory.acordesMap[acordeBaixo] || acordeBaixo.slice(0, -1);
                    }

                    novoTomAcorde = this.musicTheory.transposeAcorde(acordeBaixo, steps, novoTom);
                    novoAcorde = `${novoAcorde}/${partes[1].replace(acordeBaixo, novoTomAcorde)}`;
                }

                cifra.innerText = cifra.innerText.replace(acorde, novoAcorde);
            }
        }
    }

    tocarAcorde(acorde) {
        acorde = this.musicTheory.getAcorde(acorde, this.tomAtual);
        this.acordeTocando = this.musicTheory.simplificarAcorde(acorde);

        this.desabilitarSelectSaves();

        let [notaPrincipal, baixo] = acorde.split('/');
        let notas = this.musicTheory.getAcordeNotas(notaPrincipal);
        if (!notas) return;

        this.baixo = baixo ? baixo.replace('#', '_') : notas[0].replace('#', '_');

        this.acordeGroup = [];
        this.epianoGroup = [];
        this.adicionarSom(this.instrumento, this.baixo, 'grave');
        if (!this.elements.notesButton.classList.contains('notaSolo') && this.instrumento === 'orgao')
            this.adicionarSom('strings', this.baixo, 'grave');
        else if (this.elements.notesButton.classList.contains('pressed') && this.instrumento === 'epiano')
            this.adicionarSom('strings', this.baixo, 'grave');

        notas.forEach(nota => {
            if (this.instrumento === 'orgao' || this.instrumento === 'tone-piano') {
                this.adicionarSom(this.instrumento, nota.replace('#', '_'), 'baixo');
                if (!this.elements.notesButton.classList.contains('notaSolo'))
                    this.adicionarSom('strings', nota.replace('#', '_'), 'baixo');

                if (this.elements.notesButton.classList.contains('pressed')) {
                    this.adicionarSom(this.instrumento, nota.replace('#', '_'));
                    if (!this.elements.notesButton.classList.contains('notaSolo'))
                        this.adicionarSom('strings', nota.replace('#', '_'));
                }
            }
            else if (this.instrumento === 'epiano') {
                this.adicionarSom('epiano', nota.replace('#', '_'), 'baixo');

                if (!this.elements.notesButton.classList.contains('notaSolo'))
                    this.adicionarSom('epiano', nota.replace('#', '_'));

                if (this.elements.notesButton.classList.contains('pressed')) {
                    this.adicionarSom('strings', nota.replace('#', '_'), 'baixo');
                    this.adicionarSom('strings', nota.replace('#', '_'));
                }
            }
        });

        if (this.instrumento === 'orgao' || this.instrumento === 'tone-piano') {
            this.epianoPlay(); // Vamos usar epianoPlay como a função base unificada
        }
        else {
            if (!this.uiController.ritmoAtivo()) {
                this.epianoPlay();
            }
            else {
                this.tocarEpiano = true; // Deixa para a DrumMachine acionar depois
            }
        }

        if (typeof this.onChordChange === 'function') {
            this.onChordChange();
        }
    }

    epianoPlay() {
        this.audioManager.stopAll(this.activeSources, 0.2);
        const now = this.audioManager.audioContext.currentTime;

        const notasParaTocar = [...new Set([...this.epianoGroup, ...this.acordeGroup])];

        notasParaTocar.forEach(note => {
            // Removemos a checagem do 'tone-piano_' aqui.
            // Tudo agora é tratado como buffer normal (.ogg)
            const buffer = this.buffers.get(note);
            if (!buffer) return;

            const isLoop = !note.startsWith('epiano');
            const volume = this.getVolumeForNote(note);
            this.audioManager.playNode(buffer, now, volume, this.attack, isLoop, this.activeSources);
        });

        this.tocarEpiano = false;
    }

    // Método auxiliar para converter nomenclatura
    convertToTonePitch(noteString) {
        let name = noteString.replace('tone-piano_', '');
        let octave = "5";
        if (name.endsWith('_grave')) { octave = "3"; name = name.replace('_grave', ''); }
        else if (name.endsWith('_baixo')) { octave = "4"; name = name.replace('_baixo', ''); }
        return name.toUpperCase().replace('_', '#') + octave;
    }

    desabilitarSelectSaves() {
        this.elements.savesSelect.disabled = true;
        this.elements.addButton.disabled = true;
    }

    habilitarSelectSaves() {
        this.elements.savesSelect.disabled = false;
        this.elements.addButton.disabled = false;
    }

    pararAcorde() {
        this.habilitarSelectSaves();
        this.audioManager.stopAll(this.activeSources, this.release);
        this.activeSources.clear();
    }

    inversaoDeAcorde(acorde, baixo) {
        return this.musicTheory.inversaoDeAcorde(acorde, baixo);
    }

    preencherIframeCifra(texto) {
        this.elements.iframeCifra.contentDocument.body.innerHTML = texto;
    }

    removeCifras(musica) {
        let linhasFinal = [];
        const conteudoPre = musica.split('<pre class="cifra">')[1]?.split('</pre>')[0];

        if (conteudoPre) {
            let linhas = conteudoPre.split('\n');

            linhas.forEach(linha => {
                if (!linha.includes('span'))
                    linhasFinal.push(linha);
            });
        }

        let final = `<pre class="letra">${linhasFinal.join('\n')}</pre>`;
        this.preencherIframeCifra(final);
    }

    addEventCifrasIframe(frame) {
        const elements = frame.contentDocument.getElementsByTagName("b");

        for (let i = 0; i < elements.length; i++) {
            elements[i].addEventListener("click", (e) => {
                this.removerClasseCifraSelecionada(frame.contentDocument, e.target);

                e.target.classList.add('cifraSelecionada');
                e.target.scrollIntoView({ behavior: 'smooth' });

                this.tocarCifraManualmente(e.target);
                parent.focus(); // Mantém o foco fora do iframe para o teclado físico funcionar
            });
        }
    }

    iniciarReproducao() {
        const frameContent = this.elements.iframeCifra.contentDocument;
        this.elements_b = frameContent.getElementsByTagName('b');
        this.avancarCifra();
    }

    selecionarPrimeiraCifra() {
        const doc = this.elements.iframeCifra.contentDocument;
        if (!doc) return;

        this.elements_b = doc.getElementsByTagName('b');
        if (this.elements_b && this.elements_b.length > 0) {
            this.indiceAcorde = 0;
            this.avancarDestaque();
        }
    }

    alternarNotas() {
        if (this.indiceAcorde > 0) {
            this.indiceAcorde--;
        }

        if (!this.parado && this.acordeTocando) {
            this.avancarCifra();
        }
    }

    pararReproducao() {
        this.pararAcorde();
        const frameContent = this.elements.iframeCifra.contentDocument;

        // Remover o classList remove do cifraSelecionada — foco deve permanecer
        // Array.from(cifraElems).forEach(elemento => { elemento.classList.remove('cifraSelecionada'); });

        const acordeButtons = document.querySelectorAll('button[data-action="acorde"]');
        acordeButtons.forEach(acordeButton => {
            acordeButton.classList.remove('pressed');
        });

        // REMOVIDO: this.indiceAcorde-- causava double-decrement com o handlePlayMousedown

        this.parado = true;
        this.acordeTocando = '';
    }

    retrocederCifra() {
        if (this.indiceAcorde > 2 && this.parado === false) {
            const cifraElem = this.elements_b[this.indiceAcorde - 2];
            if (cifraElem.innerHTML === '')
                this.indiceAcorde -= 4;
            else
                this.indiceAcorde -= 2;

            this.avancarCifra();
        }
    }

    avancarCifra(inicioLinha) {
        this.parado = false;
        const frameContent = this.elements.iframeCifra.contentDocument;

        // Reiniciar cifra do início se chegar ao fim
        if (this.indiceAcorde === this.elements_b.length - 1) {
            this.indiceAcorde = 0;
        }

        if (this.indiceAcorde < this.elements_b.length) {
            this.removerClasseCifraSelecionada(frameContent);

            const cifraElem = this.elements_b[this.indiceAcorde];

            if (cifraElem) {
                const cifra = cifraElem.innerHTML.trim();
                const proximacifra = cifraElem.nextElementSibling?.innerHTML.trim() ?? '';

                if (cifraElem.nextElementSibling && !proximacifra) {
                    cifraElem.classList.add('cifraSelecionada');
                    cifraElem.nextElementSibling.scrollIntoView({ behavior: 'smooth' });
                    this.tocarAcorde(cifra);
                    this.indiceAcorde++;
                }
                else if (!cifra) {
                    cifraElem.scrollIntoView({ behavior: 'smooth' });
                    this.indiceAcorde++;
                    this.avancarCifra(true);
                }
                else {
                    this.tocarAcorde(cifra);

                    cifraElem.classList.add('cifraSelecionada');
                    if (!inicioLinha)
                        cifraElem.scrollIntoView({ behavior: 'smooth' });

                    this.indiceAcorde++;
                }
            }
        }
    }

    avancarDestaque(tentativas = 0) {
        if (tentativas > this.elements_b.length) return; // <- guarda

        if (!this.elements_b) return;
        const frameContent = this.elements.iframeCifra.contentDocument;

        if (this.indiceAcorde === this.elements_b.length - 1) {
            this.indiceAcorde = 0;
        }

        if (this.indiceAcorde < this.elements_b.length) {
            this.removerClasseCifraSelecionada(frameContent);
            const cifraElem = this.elements_b[this.indiceAcorde];
            if (cifraElem) {
                // Pula elementos vazios (marcadores de linha)
                if (!cifraElem.innerHTML.trim()) {
                    this.indiceAcorde++;
                    this.avancarDestaque(tentativas + 1); // Tenta avançar de novo, contando a tentativa para evitar loop infinito
                    return;
                }
                cifraElem.classList.add('cifraSelecionada');
                cifraElem.scrollIntoView({ behavior: 'smooth' });
                this.indiceAcorde++;
            }
        }
    }

    retrocederDestaque() {
        if (!this.elements_b) return;
        const frameContent = this.elements.iframeCifra.contentDocument;

        if (this.indiceAcorde > 2) {
            let novoIndex = this.indiceAcorde - 2;

            // Pula elementos vazios para trás
            while (novoIndex > 0 && !this.elements_b[novoIndex - 1]?.innerHTML.trim()) {
                novoIndex -= 2;
            }

            this.indiceAcorde = novoIndex;
            this.removerClasseCifraSelecionada(frameContent);
            const elem = this.elements_b[this.indiceAcorde - 1];
            if (elem) {
                elem.classList.add('cifraSelecionada');
                elem.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    getNomeArquivoAudio(nota) {
        return this.musicTheory.acordeMap[nota] || nota;
    }

    adicionarSom(instrumento, nota, oitava = '') {
        nota = nota.toLowerCase();
        nota = this.getNomeArquivoAudio(nota);
        const key = `${instrumento}_${nota}${oitava ? '_' + oitava : ''}`;

        if (instrumento === 'epiano') {
            this.epianoGroup.push(key);
        }
        else {
            this.acordeGroup.push(key);
        }
    }

    removerClasseCifraSelecionada(iframeDoc, excecao = null) {
        const elementos = iframeDoc.querySelectorAll('.cifraSelecionada');
        elementos.forEach(elemento => {
            if (elemento !== excecao) {
                elemento.classList.remove('cifraSelecionada');
            }
        });
    }

    preencherSelectAcordes(tom = 'C') {
        tom = this.musicTheory.acordesMap[tom] ?? tom;
        this.elements.tomSelect.innerHTML = '';

        this.musicTheory.tonsAcordes.forEach(tom => {
            const option = document.createElement('option');
            option.value = this.musicTheory.acordesTomMap[tom] ?? tom;
            option.text = this.musicTheory.acordesTomMap[tom] ?? tom;
            this.elements.tomSelect.appendChild(option);
        });

        this.elements.tomSelect.value = tom;
    }

    preencherSelectCifras(tom) {
        var option = '<option value="">Letra</option>';

        this.elements.tomSelect.innerHTML = option;
        const tons = this.musicTheory.tonsMaiores.includes(tom) ? this.musicTheory.tonsMaiores : this.musicTheory.tonsMenores.includes(tom) ? this.musicTheory.tonsMenores : [];

        tons.forEach(tom => {
            const option = document.createElement('option');
            option.value = tom;
            option.text = tom;
            this.elements.tomSelect.appendChild(option);
        });

        this.elements.tomSelect.value = tom;
        this.tomAtual = tom;
        this.tomOriginal = tom;
    }

    tocarCifraManualmente(cifraElem) {
        const elements_b = this.elements.iframeCifra.contentDocument.getElementsByTagName("b");
        const cifraid = parseInt(cifraElem.id.split('cifra')[1]);
        this.indiceAcorde = Array.from(elements_b).findIndex(b => parseInt(b.id.split('cifra')[1]) === cifraid);

        if (!this.parado && this.acordeTocando) {
            this.iniciarReproducao();
        }
    }

    atualizarVolumeStringsParaEpiano() {
        this.fatorVolumeStrings = 1.0; // Strings ficam na mesma altura do Epiano
    }

    atualizarVolumeStringsParaOrgao() {
        this.fatorVolumeStrings = 1.25; // Strings ficam um pouco mais baixas que o Órgão
    }
}
