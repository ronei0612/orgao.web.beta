# Instruções do Projeto: Órgão Web (Editor de Partituras)

## Visão Geral

Este é um aplicativo web de música com editor e player de cifras e partituras. O sistema é composto por três classes principais que trabalham em conjunto: `PartituraEditor`, `PartituraPlayer` e `App`.

O ponto de entrada é o `index.html`, que monta toda a estrutura de DOM, carrega as dependências e instancia a classe `App` no evento `DOMContentLoaded`.

---

## Arquitetura das Classes

### 1. `PartituraEditor` (`PartituraEditor.js`)

Responsável por renderizar, editar e persistir partituras usando a biblioteca **VexFlow**.

**Propriedades principais:**
- `basePitches`: Array cromático de notas de `e/3` até `d#/6` (formato VexFlow: `nota/oitava`).
- `currentData`: Array de objetos representando cada nota. Cada objeto tem: `{ notes, chord, lyric, bar }`.
- `persistentSelectedIndex`: Índice da nota selecionada no editor.
- `highlightIndex`: Índice da nota destacada durante a reprodução (modo visualização).
- `noteXPositions`: Array com posições X absolutas de cada nota no SVG.
- `editIframe` / `viewIframe`: Dois iframes — um para edição, outro para visualização.

**Métodos principais:**

| Método | Descrição |
|---|---|
| `abrirEditor(dataArray)` | Inicializa o editor com dados. Se vazio, cria nota padrão `b/4`. |
| `renderizarVisualizacao(dataArray)` | Renderiza a partitura no iframe de visualização (somente leitura). |
| `obterDadosParaSalvar()` | Serializa `currentData` para string. Formato: `[Cifra]nota@letra\|` |
| `draw(iframe, isEditable)` | Redesenha a partitura no iframe especificado via VexFlow. |
| `normalizeItem(item)` | Converte string serializada para objeto `{ notes, chord, lyric, bar }`. |
| `addNewNote()` | Insere nova nota `b/4` após o cursor. |
| `deleteNoteAtCursor()` | Remove a nota no cursor. |
| `toggleBar()` | Adiciona/remove barra de compasso na nota atual. |
| `navegarCursor(direcao)` | Move o cursor -1 ou +1. |
| `alterarAltura(direcao)` | Sobe/desce a nota cromáticamente. |
| `showInlineInput(type)` | Exibe input flutuante para editar cifra (`chord`) ou letra (`lyric`). |
| `commitInput()` | Salva o valor do input inline em `currentData`. |

**Formato de serialização de dados (string por nota):**
```
[Cifra]nota/oitava@letra|
```
- `[Cifra]` — opcional, cifra harmônica (ex: `[Am]`).
- `nota/oitava` — nota no formato VexFlow (ex: `c#/5`). Múltiplas notas separadas por vírgula para acordes.
- `@letra` — opcional, sílaba da letra.
- `|` — opcional, indica fim de compasso.

**Exemplo de dado serializado (uma linha por nota):**
```
[Am]a/4@A
b/4@le
c/5@lu
[G]b/4@ia|
```

---

### 2. `PartituraPlayer` (`PartituraPlayer.js`)

Responsável pela reprodução sequencial da partitura.

**Propriedades:**
- `partituraPlaybackIndex`: Índice da nota sendo tocada atualmente. `-1` = parado.
- `cifraPlayer`: Instância do player de áudio.
- `partituraEditor`: Referência ao editor para leitura de `currentData` e atualização do `highlightIndex`.

**Métodos:**

| Método | Descrição |
|---|---|
| `tocarNotaAtualPartitura()` | Toca a nota no `partituraPlaybackIndex`. Toca o acorde se houver `chord`. Atualiza o destaque visual no iframe. |
| `avancarNotaAtualPartitura()` | Incrementa o índice e toca a próxima nota. |
| `retrocederNotaAtualPartitura()` | Decrementa o índice e toca a nota anterior. |

**Fluxo de reprodução:**
1. `App.handlePlayMousedown()` define `partituraPlaybackIndex = 0` e chama `tocarNotaAtualPartitura()`.
2. O usuário avança manualmente com o botão "Avançar" ou retrocede com "Retroceder".
3. `App.handleStopMousedown()` reseta `partituraPlaybackIndex = -1` e `highlightIndex = -1`, redesenhando a partitura sem destaque.

---

### 3. `App` (`App.js`)

Orquestra todo o sistema: UI, eventos, localStorage, player e editor.

**Propriedades relevantes:**
- `currentEditorType`: `'cifra'` ou `'partitura'` — define o modo atual do editor.
- `LOCAL_STORAGE_SAVES_KEY`: `'saves'` — chave do localStorage para músicas salvas.
- `partituraEditor`: Instância de `PartituraEditor`.
- `partituraPlayer`: Instância de `PartituraPlayer`.

**Fluxo: Criar nova partitura**
1. Usuário clica em `+` → `handleAddClick()`.
2. Modal pergunta tipo: `'cifra'` ou `'partitura'` → `uiController.chooseEditorType()`.
3. Se `'partitura'`: chama `uiController.editarMusica('partitura')` e `partituraEditor.abrirEditor([])`.
4. Iframe `partituraEditFrame` fica visível; `editTextarea` fica oculto.

**Fluxo: Editar partitura existente**
1. Usuário clica no ícone de lápis → `handleEditSaveClick()`.
2. Carrega dados do localStorage → `localStorageManager.getSaveJson()`.
3. Detecta tipo: `saveData.type === 'partitura'`.
4. Chama `partituraEditor.abrirEditor(dataArray)` com as linhas do campo `chords`.

**Fluxo: Salvar partitura**
1. Usuário clica em Salvar → `handleSaveClick()` → `salvarSave()`.
2. Se `currentEditorType === 'partitura'`: coleta dados via `partituraEditor.obterDadosParaSalvar()`.
3. Armazena em `editTextarea.value` temporariamente.
4. Chama `salvarMetaDataNoLocalStorage()` que grava o objeto completo no localStorage.

**Estrutura do objeto salvo no localStorage:**
```json
{
  "chords": "b/4\nc/5@letra|",
  "key": "C",
  "instrument": "orgao",
  "style": "estilo-melodia",
  "bpm": 90,
  "type": "partitura"
}
```

**Fluxo: Visualizar/tocar partitura**
1. Usuário seleciona música → `selectEscolhido()` → `showLetraCifra(saveData)`.
2. Detecta `type === 'partitura'`.
3. Exibe `partituraFrame` (iframe de visualização), esconde `iframeCifra`.
4. Chama `partituraEditor.renderizarVisualizacao(dataArray)`.
5. Ao clicar Play → `handlePlayMousedown()` inicia `partituraPlayer`.

---

## Integração entre os Iframes

O sistema usa **dois iframes** para separar edição de visualização:

| iframe | ID | Uso |
|---|---|---|
| `partituraEditFrame` | `#partituraEditFrame` | Editor interativo com botões de navegação/edição |
| `partituraFrame` | `#partituraFrame` | Visualização da partitura durante a reprodução |

O `PartituraEditor` recebe referências a ambos e usa `draw(iframe, isEditable)` para renderizar em cada um conforme necessário.

---

## Convenções e Regras Importantes

1. **Formato de nota VexFlow**: sempre `nota/oitava` em minúsculas (ex: `c#/4`, `a/5`). Bemóis usam `b` (ex: `bb/4`).
2. **Acidentes**: detectados via regex `([a-g])([#b])\//i` e adicionados como `Accidental` no VexFlow.
3. **Haste de nota oculta**: `note.getStem().hide = true` — todas as notas são exibidas sem haste (estilo canto coral).
4. **Modo escuro**: detectado por `document.body.classList.contains('dark-mode')`. O SVG recebe `filter: invert(1) hue-rotate(180deg)`.
5. **Largura da partitura**: calculada como `Math.max(iframe.clientWidth - 80, currentData.length * 100)` — expande automaticamente.
6. **LocalStorage**: dados antigos (sem campo `type`) são detectados verificando se `chords` contém `@` (caractere usado apenas em partituras).

---

## Estrutura do HTML (`index.html`)

### Elementos de UI e seus IDs

Todos os IDs abaixo são coletados no objeto `elements` dentro do `DOMContentLoaded` e passados ao construtor de `App`.

#### Barra Superior
| ID | Tipo | Função |
|---|---|---|
| `tomSelect` | `<select>` | Seletor de tom (C a B). Dispara `change` ao trocar tom. |
| `decreaseTom` | `<button>` | Diminui o tom em um semitom. |
| `increaseTom` | `<button>` | Aumenta o tom em um semitom. |
| `bpm-input` | `<input text>` | Valor de BPM. Padrão: `90`. |
| `decrement-bpm` | `<button>` | Diminui BPM em 1. |
| `decrement-bpm-5` | `<button>` | Diminui BPM em 5. |
| `increment-bpm-5` | `<button>` | Aumenta BPM em 5. |
| `savesSelect` | `<select>` | Lista de músicas salvas (Select2). |
| `selectedButton` | `<button>` | Exibido no lugar do select em modo compacto. |
| `itemNameInput` | `<input text>` | Nome da música durante criação/edição. |
| `saveButton` | `<button>` | Confirma o salvamento. Ícone: ✓ |
| `cancelButton` | `<button>` | Cancela a edição. |
| `addButton` | `<button>` | Abre opções para adicionar nova música. Ícone: `plus-square.svg` |
| `editSavesSelect` | `<button>` | Abre editor da música selecionada. Ícone: lápis. Oculto por padrão. |
| `deleteSavesSelect` | `<button>` | Exclui a música selecionada. Ícone: lixeira. Oculto por padrão. |

#### Área de Conteúdo (iframes e textarea)
| ID | Tipo | Visibilidade padrão | Função |
|---|---|---|---|
| `iframeCifra` | `<iframe>` | **Visível** | Exibe a cifra/letra formatada em HTML. |
| `partituraFrame` | `<iframe>` | `d-none` | Exibe a partitura em modo visualização (somente leitura). |
| `partituraEditFrame` | `<iframe>` | `d-none` | Exibe o editor interativo de partitura. |
| `editTextarea` | `<textarea>` | `d-none` | Editor de texto para cifras. |
| `liturgiaDiariaFrame` | `<iframe>` | `d-none` | Liturgia diária (URL externa). |
| `santamissaFrame` | `<iframe>` | `d-none` | Ordinário da Santa Missa (`santamissa.html`). |
| `oracoesFrame` | `<iframe>` | `d-none` | Orações (`oracoes.html`). |

> **Regra de visibilidade**: em qualquer momento, apenas **um** dos iframes de conteúdo deve estar visível. `UIController` gerencia isso via `classList.add/remove('d-none')`.

#### Controles de Transporte (Playback)
Ficam dentro de `#draggableControls` (posição arrastável).

| ID | Tipo | `data-action` | Função |
|---|---|---|---|
| `playButton` | `<button>` | `play` | Inicia reprodução. |
| `stopButton` | `<button>` | `stop` | Para reprodução. Oculto por padrão. |
| `avancarButton` | `<button>` | — | Avança nota (partitura) ou acorde (cifra). Oculto por padrão. |
| `retrocederButton` | `<button>` | — | Retrocede nota/acorde. Oculto por padrão. |
| `notesButton` | `<button>` | `notes` | Alterna entre acorde cheio e nota solo. |

#### Botões de Acordes
Todos têm `data-action="acorde"` e `value` com o nome do acorde.

**Acordes principais** (linha inferior, maior):
`acorde1=C`, `acorde2=Am`, `acorde3=F`, `acorde4=Dm`, `acorde5=G`, `acorde6=Em`

**Acordes secundários** (linha superior, menor):
`acorde7=A`, `acorde8=E`, `acorde9=Bb`, `acorde10=D`, `acorde11=B°`

#### Bateria (`#bateriaWrapper`) — oculto por padrão
| ID | Função |
|---|---|
| `drumStyleSelect` | Select de estilos de bateria. |
| `bateriaInstrumentButton` | Alterna instrumento para Bateria/E-Piano. |
| `num-steps` | Número de steps do sequenciador (padrão: 4). |
| `tracks` | Container onde `DrumMachine` injeta as trilhas dinamicamente. |
| `save-rhythm` / `copy-rhythm` / `paste-rhythm` | Operações de ritmo. |

#### Melodia (`#melodyWrapper`) — sempre visível
| ID | Função |
|---|---|
| `melodyStyleSelect` | Select de estilos de melodia para o órgão. |
| `orgaoInstrumentButton` | Alterna instrumento para Órgão/E-Piano. |
| `melodyTracks` | Container de trilhas de melodia. Oculto por padrão. |
| `melody-num-steps` | Número de steps da melodia (padrão: 8). |

#### Botões de Percussão (`#rhythm-buttons`) — oculto por padrão
Cinco botões com classe `.rhythm-button`:
`rhythm-a` (Chimbal Fechado), `rhythm-b` (Bumbo), `rhythm-c` (Caixa), `rhythm-d` (Chimbal Aberto), `rhythm-e` (Meia-Lua).

---

### Modais Bootstrap

| ID | Acionado por | Função |
|---|---|---|
| `optionsModal` | `#menuButton` (ícone menu.svg) | Menu de opções: dark mode, links, salvar/importar repertório, restaurar, sobre. |
| `searchModal` | `#searchButton` ou botão Pesquisar | Pesquisa de músicas local + CifraClub. Contém `#searchInput`, `#searchResults`, `#cifraDisplay`, botão `#tocarButton`. |
| `customConfirmModal` | `uiController.customConfirm()` | Modal de confirmação customizado com botões "Sim" / "Não". |
| `customAlertModal` | `uiController.customAlert()` | Modal de alerta customizado com botão "OK". |

#### Itens do `#optionsModal`
| ID | Função |
|---|---|
| `darkModeToggle` | Checkbox que ativa/desativa o modo escuro. |
| `missaOrdinarioLink` | Exibe `santamissaFrame`. |
| `liturgiaDiariaLink` | Exibe `liturgiaDiariaFrame`. |
| `oracoesLink` | Exibe `oracoesFrame`. |
| `downloadSavesLink` | Baixa repertório como JSON. |
| `uploadSavesLink` | Importa JSON de repertório. |
| `downloadStylesLink` | Baixa styles de bateria (oculto em produção). |
| `restoreLink` | Limpa localStorage e recarrega. |
| `about` | Exibe modal com versão e logs de debug. |
| `volumeOrgao` | Input numérico para volume do órgão (padrão: `0.7`). |

---

### Ordem de Carregamento dos Scripts

Os scripts são carregados no final do `<body>` nesta ordem, o que define as dependências:

```
jQuery → Popper.js → Bootstrap → Select2 → VexFlow
  ↓
logIntercepted.js
AudioContextManager.js
DraggableController.js
CifraPlayer.js
PartituraPlayer.js
MusicTheory.js
UIController.js
LocalStorageManager.js
PartituraEditor.js
App.js          ← instancia tudo no DOMContentLoaded
DrumMachine.js
BateriaUI.js
MelodyMachine.js
MelodyUI.js
```

> **Atenção**: `App.js` deve vir antes de `DrumMachine`, `BateriaUI`, `MelodyMachine` e `MelodyUI` porque estes são instanciados dentro do método `App.init()`, que é `async`.

---

## Dependências Externas

- **VexFlow 4.2.5** (`Vex.Flow`): biblioteca de notação musical para SVG. CDN: `cdn.jsdelivr.net/npm/vexflow@4.2.5/build/cjs/vexflow.js`
- **Bootstrap 4.6.2**: grid, modais, botões. CSS e JS locais em `./assets/lib/`.
- **Bootstrap Icons 1.8.1**: ícones (`bi bi-*`) usados nos botões da bateria e melodia.
- **Select2 4.1.0-rc.0**: componente de busca do `#savesSelect`. CDN: `cdn.jsdelivr.net`.
- **jQuery 3.5.1**: requerido pelo Bootstrap 4 e Select2. Local em `./assets/lib/`.
- **Font Awesome 5.15.4**: ícones adicionais. CDN: `cdnjs.cloudflare.com`.

---

## Extensibilidade: Pontos de Atenção

- Para adicionar **reprodução automática** (auto-avanço por BPM), o `PartituraPlayer.tocarNotaAtualPartitura()` deve chamar `avancarNotaAtualPartitura()` com um `setTimeout` baseado em `musicTheory.bpm`.
- Para adicionar **notas de duração variável**, é necessário alterar `duration: "q"` no `draw()` e atualizar o `beat_value` da `Voice`.
- Para adicionar **múltiplas vozes/pautas**, o método `draw()` precisaria criar múltiplas instâncias de `Stave` e `Voice`.
- O campo `chord` suporta qualquer string de cifra (ex: `Am7`, `Cm/G`) e é renderizado via `ChordSymbol` do VexFlow.
