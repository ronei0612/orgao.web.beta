# Instruções do Projeto: Órgão Web (Editor de Partituras)

## Visão Geral

Este é um aplicativo web de música com editor e player de cifras e partituras. O sistema é composto por três classes principais que trabalham em conjunto: `PartituraEditor`, `PartituraPlayer` e `App`.

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

## Dependências Externas

- **VexFlow** (`Vex.Flow`): biblioteca de notação musical para SVG. Deve estar carregada globalmente antes das classes.
- **Bootstrap 4** + **Select2**: UI e componente de busca do select.
- **jQuery**: utilizado para manipulação do Select2.

---

## Extensibilidade: Pontos de Atenção

- Para adicionar **reprodução automática** (auto-avanço por BPM), o `PartituraPlayer.tocarNotaAtualPartitura()` deve chamar `avancarNotaAtualPartitura()` com um `setTimeout` baseado em `musicTheory.bpm`.
- Para adicionar **notas de duração variável**, é necessário alterar `duration: "q"` no `draw()` e atualizar o `beat_value` da `Voice`.
- Para adicionar **múltiplas vozes/pautas**, o método `draw()` precisaria criar múltiplas instâncias de `Stave` e `Voice`.
- O campo `chord` suporta qualquer string de cifra (ex: `Am7`, `Cm/G`) e é renderizado via `ChordSymbol` do VexFlow.
