# CLAUDE.md — Órgão.Web

Documentação técnica do projeto para orientar desenvolvimento assistido por IA.

---

## Visão Geral

**Órgão.Web** é um aplicativo web de música litúrgica que roda inteiramente no browser, sem backend. Permite tocar acordes de órgão/epiano, criar e reproduzir cifras e partituras, e programar ritmos de bateria e melodia via sequenciadores step.

**Stack:** HTML5 + CSS3 + JavaScript puro (ES6 classes), Bootstrap 4.6, jQuery, Select2, VexFlow 4, Web Audio API.

---

## Arquitetura

Todas as classes são instanciadas e orquestradas por `App` no evento `DOMContentLoaded`. Não há framework, bundler ou módulos ES — os scripts são carregados via `<script>` em `index.html` na ordem correta.

```
App
├── AudioContextManager   — Web Audio API compartilhado (único contexto)
├── MusicTheory           — Teoria musical: acordes, tons, transposição
├── UIController          — Manipulação de DOM / modais / dark mode
├── LocalStorageManager   — CRUD de músicas salvas no localStorage
├── CifraPlayer           — Toca acordes (órgão/strings/epiano)
├── PartituraEditor       — Editor/visualizador de partitura (VexFlow)
├── PartituraPlayer       — Reproduz notas da partitura (flauta)
├── DrumMachine           — Sequenciador de bateria (Web Audio)
├── BateriaUI             — UI do sequenciador de bateria
├── MelodyMachine         — Sequenciador de melodia/órgão (Web Audio)
├── MelodyUI              — UI do sequenciador de melodia
├── StyleManager          — Gerencia estilos/ritmos no localStorage
├── DraggableController   — Arrastar painel de controles
└── CifrasEditor          — Editor de cifras (página separada)
```

---

## Fluxo de Dados Crítico

### Áudio
- `AudioContextManager` é instanciado **uma única vez** em `App` e passado para `CifraPlayer` e `PartituraPlayer`.
- `DrumMachine` e `MelodyMachine` criam seus próprios nós de áudio mas usam o mesmo `audioContext` de `AudioContextManager`.
- **Nunca crie um segundo `AudioContext`** — o browser limita a quantidade e causa erros silenciosos.

### Acordes
1. Usuário clica num botão de acorde → `CifraPlayer.tocarAcorde(acorde)`
2. `CifraPlayer` resolve notas via `MusicTheory.getAcordeNotas()`
3. Notas são agrupadas em `acordeGroup` / `epianoGroup`
4. `AudioContextManager.setNotes()` + `.play()` dispara o áudio
5. Callback `onChordChange` é chamado → `MelodyUI.play()` (se órgão ativo)

### Sequenciadores (DrumMachine / MelodyMachine)
Ambos usam o padrão **lookahead scheduler**:
- `setInterval` a cada 25ms chama `scheduler()`
- `scheduler()` verifica `nextNoteTime < currentTime + scheduleAheadTime`
- Agenda notas com Web Audio API no futuro próximo (preciso)
- DOM é atualizado via `setTimeout` apenas para feedback visual

---

## Arquivos Principais

| Arquivo | Responsabilidade |
|---|---|
| `App.js` | Raiz da aplicação; instancia tudo; bind de eventos globais |
| `CifraPlayer.js` | Toca acordes; transpõe cifras no iframe; gerencia reprodução automática |
| `MusicTheory.js` | Dicionário de acordes, campos harmônicos, transposição, descoberta de tom |
| `DrumMachine.js` | Sequenciador de bateria; carrega `.ogg`; scheduler de áudio |
| `BateriaUI.js` | UI do drum machine; gestão de ritmos A/B/C/D e fills; StyleManager |
| `MelodyMachine.js` | Sequenciador de órgão; mapa de acordes → notas do órgão |
| `MelodyUI.js` | UI do sequenciador de melodia; save/load de padrões |
| `PartituraEditor.js` | Editor gráfico de partitura via VexFlow dentro de iframes |
| `PartituraPlayer.js` | Reproduz notas da partitura com samples de flauta |
| `StyleManager.js` | Abstração de CRUD de estilos/padrões no localStorage |
| `AudioContextManager.js` | Web Audio API: carrega buffers, toca com attack/release, gerencia polifonia |
| `UIController.js` | Mostrar/esconder elementos; modais customizados; dark mode |
| `LocalStorageManager.js` | Wrapper de JSON sobre localStorage para músicas salvas |
| `DraggableController.js` | Drag & drop do painel de controle (mouse e touch) |
| `logIntercepted.js` | Intercepta `console.log/error/warn` e salva no localStorage |
| `index.html` | HTML único; carrega todos os scripts; define todos os elementos DOM |

---

## Persistência (localStorage)

| Chave | Conteúdo |
|---|---|
| `saves` | Músicas salvas: `{ [nome]: { chords, key, instrument, style, bpm, type } }` |
| `savesAcordes` | Metadados da tela de acordes livre |
| `drumStylesData` | Estilos/ritmos da bateria: `{ styles: [], data: { [estilo]: { A, B, C, D, A-fill, ... } } }` |
| `melodyStylesData` | Padrões de melodia: `{ styles: [], data: { [estilo]: { orgao_0, orgao_1, ... } } }` |
| `versao_app` | Última versão vista pelo usuário |
| `debug_logs_v1` | Últimos 50 logs de debug |
| `darkMode` | `'true'` \| `'false'` |

### Formato de uma música salva
```json
{
  "chords": "<pre class=\"cifra\">...</pre>",
  "key": "G",
  "instrument": "orgao",
  "style": "Valsa",
  "bpm": 90,
  "type": "cifra"
}
```
`type` pode ser `"cifra"` ou `"partitura"`. Partituras usam formato textual próprio em `chords` (ex: `[G]g/4@Palavra|`).

---

## Formato da Partitura (serialização)

Cada nota é uma linha no formato:

```
[AcordeOpcional]nota/oitava@letraOpcional|
```

- `[G]` — cifra harmônica (opcional)
- `g/4` — nota VexFlow (letra + oitava)
- `@texto` — letra da música sob a nota (opcional)
- `|` — barra de compasso após esta nota (opcional)
- `R|` como prefixo — pausa (rest)

Exemplo: `[Am]a/4@A-men|`

---

## Convenções de Nomes de Notas

O sistema usa dois esquemas de nomes dependendo do contexto:

**CifraPlayer / MusicTheory** (nomes de acordes):
- Sustenidos com `#`: `C#`, `F#`, `G#`
- Internamente mapeados para arquivos: `c_`, `f_`, `g_`

**DrumMachine / MelodyMachine** (nomes de arquivos de áudio):
- `_` substitui `#`: `c_`, `d_`, `f_`
- Sufixos de oitava: `_grave`, `_baixo`, (sem sufixo = agudo)

**VexFlow / PartituraEditor** (notas da pauta):
- Formato `nota/oitava`: `c/4`, `g#/3`, `a#/4`
- Internamente `#` vira `_` para nomes de arquivo: `g_3`, `a_4`

---

## Sequenciador de Melodia — Estrutura de Acordes

`MelodyMachine.acordes` mapeia nome de acorde → array de 5 notas do órgão:

```js
'c': ['c_grave', 'c_baixo', 'e_baixo', 'g_baixo', 'c']
// índice:  0           1           2           3       4
```

Cada índice corresponde a uma "Voz" (trilha) na UI:
- Voz 1 (`noteIndex: 4`) → nota aguda
- Voz 2 (`noteIndex: 3`) → ...
- Voz 5 (`noteIndex: 0`) → nota grave (sempre toca automaticamente no tempo 1)

A chave do acorde é `acordeNome + (acordeFull ? '1' : '')`. O sufixo `1` seleciona voicings em posição aberta (oitava acima).

---

## Instrumentos Disponíveis

| Instrumento | Contexto | Arquivos |
|---|---|---|
| `orgao` | CifraPlayer + MelodyMachine | `/assets/audio/Orgao/orgao_*.ogg` |
| `strings` | CifraPlayer (camada harmônica) | `/assets/audio/Strings/strings_*.ogg` |
| `epiano` | CifraPlayer (modo bateria) | `/assets/audio/Epiano/epiano_*.ogg` |
| `flauta` | PartituraPlayer | `/assets/audio/studio/Flauta/flauta_*.ogg` |
| Bateria | DrumMachine | `/assets/audio/studio/Drums/*.ogg` |
| `baixo` | DrumMachine | `/assets/audio/studio/Drums/baixo_*.ogg` |
| `violao` | DrumMachine | `/assets/audio/studio/Drums/violao_*.ogg` |

---

## Padrões Importantes

### Cache de DOM no Scheduler
`DrumMachine` e `MelodyMachine` mantêm `tracksCache` — um array pré-construído com referências diretas aos elementos DOM. **Nunca faça `querySelector` dentro do scheduler** (chamado a cada 25ms). Invalide o cache com `tracksCache = null` ao mudar a UI.

### onStepsEnd / onChordChange
Callbacks usados para comunicação entre classes sem acoplamento direto:
```js
this.melodyMachine.onStepsEnd = () => { ... };   // fim do compasso
this.cifraPlayer.onChordChange = () => { ... };  // troca de acorde
this.drumMachine.onStepsEnd = this.bateriaUI.onStepsEnd.bind(this.bateriaUI);
```

### Modo Órgão vs Bateria
- `cifraPlayer.instrumento === 'orgao'` → mostra MelodyWrapper, esconde BateriaWrapper
- `cifraPlayer.instrumento === 'epiano'` → mostra BateriaWrapper, esconde MelodyWrapper
- O instrumento é salvo por música em localStorage

### iframe para Cifras
O conteúdo da cifra é renderizado dentro de `#iframeCifra`. Tags `<b>` são os acordes clicáveis. O DOM do iframe é acessado via `iframe.contentDocument`.

---

## Adicionando Novos Estilos de Ritmo

1. Via UI: botão **+** no `drumStyleSelect` / `melodyStyleSelect`
2. Ou diretamente no JSON em `styles.json` / `styles-melody.json` (carregados na inicialização)
3. Estrutura drumStylesData:
```json
{
  "styles": ["Valsa", "Baião"],
  "data": {
    "Valsa": {
      "A": { "numSteps": 12, "bumbo": { "steps": [...], "selected": true }, ... },
      "A-fill": { ... },
      "B": { ... }
    }
  }
}
```

---

## Pontos de Atenção

- **`AudioContext` suspenso:** O browser suspende o contexto de áudio até interação do usuário. Sempre verifique `audioContext.state === 'suspended'` e chame `.resume()` antes de tocar.
- **Ordem dos scripts em `index.html`:** As classes dependem umas das outras; a ordem de `<script>` importa. `MusicTheory` deve vir antes de `CifraPlayer`, etc.
- **`BASE_URL`:** Em desenvolvimento local (protocolo `file:`), a URL base aponta para o servidor de produção `roneicostasoares.com.br` para carregar os assets de áudio.
- **VexFlow:** Usado apenas dentro de iframes (`partituraFrame`, `partituraEditFrame`). Cada `draw()` recria o SVG do zero.
- **Select2:** Wrappa `#savesSelect`. Eventos devem usar `$('#savesSelect').on('select2:select', ...)` em vez de `change` nativo.
