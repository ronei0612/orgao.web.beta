class CifraPlayer {
    constructor(elements, uiController, musicTheory, baseUrl) {
        this.audioPath = `${baseUrl}/assets/audio/`;
        this.uiController = uiController;
        this.musicTheory = musicTheory;
        this.elements = elements;

        this.acordeGroup = [];
        this.epianoGroup = [];
        this.tocarEpiano = false;
        this.parado = true;
        this.acordeTocando = '';
        this.indiceAcorde = 0;
        this.tomAtual = 'C';
        this.tomOriginal = null;
        this.elements_b = null;
        this.instrumento = 'orgao';
        this.attack = 0.2;
        this.release = 0.2;
        this.baixo = null;

        this.audioContextManager = new AudioContextManager();
        this.carregarAcordes();
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
        const linhas = texto.split('\n');
        let cifraNum = 1;
        const temPalavra = /[a-zA-Z]{4,}/; // Não remover! Usar caso necessário
        const temColchetes = /\[.*?\]/;
        var musicaCifrada = false;

        const linhasDestacadas = linhas.map(linha => {
            if (linha) {
                const acordes = linha.trim().split(/\s+/);
                const primeiroAcordePuro = acordes[0].split('(')[0].split('/')[0];
                const segundoAcordePuro = acordes[1]?.split('(')[0].split('/')[0];
                const ehLinhaDeAcordeUnico = acordes.length === 1 && this.musicTheory.notasAcordes.includes(primeiroAcordePuro);
                const ehLinhaDeAcordesConsecutivos = acordes.length >= 2 && this.musicTheory.notasAcordes.includes(primeiroAcordePuro) && this.musicTheory.notasAcordes.includes(segundoAcordePuro);
                const linhDeColcheteseAcordes = temColchetes.test(linha) && acordes.length >= 2 && this.musicTheory.notasAcordes.includes(segundoAcordePuro);

                if (ehLinhaDeAcordeUnico || ehLinhaDeAcordesConsecutivos || linhDeColcheteseAcordes) {
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

    carregarAcordes() {
        const urlsDict = {};
        const instrumentos = ['orgao', 'strings', 'epiano'];
        const oitavas = ['grave', 'baixo', ''];
        const notas = this.musicTheory.notas;

        const VOLUME_CONFIG = {
            'grave': {
                'orgao': 1.0,
                'strings': 0.9,
                'epiano': 1.0
            },
            'baixo': {
                'orgao': 1.0,
                'strings': 0.8,
                'epiano': 1.0
            },
            'agudo': {
                'orgao': 0.6,
                'strings': 1.0,
                'epiano': 1.0
            }
        };

        instrumentos.forEach(instrumento => {
            notas.forEach(nota => {
                oitavas.forEach(oitava => {
                    const key = `${instrumento}_${nota}${oitava ? '_' + oitava : ''}`;
                    const path = `${this.audioPath}${instrumento.charAt(0).toUpperCase() + instrumento.slice(1)}/${key}.ogg`;
                    const oitavaKey = oitava === '' ? 'agudo' : oitava;
                    const volume = VOLUME_CONFIG[oitavaKey]?.[instrumento] ?? 1.0;

                    urlsDict[key] = { url: path, volume: volume };
                });
            });
        });

        this.audioContextManager.loadInstruments(urlsDict);
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
            if (this.instrumento === 'orgao') {
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

        this.audioContextManager.setNotes(this.epianoGroup);
        this.audioContextManager.addNotes(this.acordeGroup);

        if (this.instrumento === 'orgao') {
            this.audioContextManager.play(this.attack);
        }
        else {
            if (!this.uiController.ritmoAtivo()) {
                this.epianoPlay();
            }
            else {
                this.tocarEpiano = true;
            }
        }
    }

    epianoPlay() {
        this.audioContextManager.play(this.attack);
        this.tocarEpiano = false;
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

        this.audioContextManager.stop(this.release);
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
        const cifraElems = frameContent.getElementsByClassName('cifraSelecionada');

        Array.from(cifraElems).forEach(elemento => {
            elemento.classList.remove('cifraSelecionada');
        });


        const acordeButtons = document.querySelectorAll('button[data-action="acorde"]');
        acordeButtons.forEach(acordeButton => {
            acordeButton.classList.remove('pressed');
        });

        if (this.indiceAcorde > 0) {
            this.indiceAcorde--;
        }

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
        Object.keys(this.audioContextManager.instrumentSettings).forEach(key => {
            if (key.startsWith('strings_')) {
                this.audioContextManager.instrumentSettings[key].volume = 1.0;
            }
        });
    }

    atualizarVolumeStringsParaOrgao() {
        Object.keys(this.audioContextManager.instrumentSettings).forEach(key => {
            if (key.startsWith('strings_')) {
                if (key.includes('_grave')) {
                    this.audioContextManager.instrumentSettings[key].volume = 0.9;
                } else if (key.includes('_baixo')) {
                    this.audioContextManager.instrumentSettings[key].volume = 0.8;
                } else {
                    this.audioContextManager.instrumentSettings[key].volume = 1.0;
                }
            }
        });
    }
}
