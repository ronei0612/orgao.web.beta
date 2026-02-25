class CifrasEditor {
    constructor() {
        this.cifras = [];
        this.cifrasToImport = [];
        this.url = 'https://roneicostasoares.com.br/orgao.web/cifras.json';
        this.LOCAL_KEY = 'cifras_local';
        this.selectedCifraIndex = -1; // Índice da cifra sendo editada

        // Elementos DOM
        this.elements = {
            cifraSelect: document.getElementById('cifra-select'),
            addBtn: document.getElementById('add-btn'),
            deleteBtn: document.getElementById('delete-btn'),
            saveBtn: document.getElementById('save-btn'),
            downloadBtn: document.getElementById('download-btn'),
            clearBtn: document.getElementById('clear-btn'),
            importBtn: document.getElementById('import-btn'),
            importFileInput: document.getElementById('import-file-input'),
            importContainer: document.getElementById('import-cards-container'),

            // Card de Edição
            editCard: document.getElementById('cifra-edit-card'),
            cardTitle: document.getElementById('card-title'),
            editId: document.getElementById('edit-id'),
            editTitulo: document.getElementById('edit-titulo'),
            editArtista: document.getElementById('edit-artista'),
            editCifra: document.getElementById('edit-cifra'),
        };
    }

    init() {
        this.loadCifras().then(() => {
            this.setupSelect2();
            this.bindEvents();
        });
    }

    bindEvents() {
        this.elements.addBtn.addEventListener('click', this.addCifra.bind(this));
        this.elements.deleteBtn.addEventListener('click', this.deleteSelectedCifra.bind(this));
        this.elements.saveBtn.addEventListener('click', this.saveCurrentCifra.bind(this));
        this.elements.clearBtn.addEventListener('click', this.clearCifras.bind(this)); 
        this.elements.downloadBtn.addEventListener('click', this.downloadJson.bind(this));
        this.elements.importBtn.addEventListener('click', this.uploadJson.bind(this));
        this.elements.importFileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.elements.importContainer.addEventListener('click', this.handleImportCardAction.bind(this));

        // Listeners nos campos do Card para salvar automaticamente
        [this.elements.editTitulo, this.elements.editArtista, this.elements.editCifra].forEach(el => {
            el.addEventListener('input', this.handleCardInputChange.bind(this));
        });
    }

    setupSelect2() {
        this.elements.cifraSelect.innerHTML = '';
        // Inicializa Select2 com as opções (cifras)
        const data = this.cifras.map((cifra, index) => ({
            id: index, // Usamos o índice do array como ID (pois é temporário)
            text: `${cifra.titulo} - ${cifra.artista ?? ''}`
        }));

        $(this.elements.cifraSelect).select2({
            data: data,
            theme: 'bootstrap4',
            placeholder: "Selecione uma Cifra para Editar...",
            allowClear: true
        });

        $(this.elements.cifraSelect).val(null).trigger('change'); 
        // Evento Select2: Seleção de Cifra
        $(this.elements.cifraSelect).on('select2:select', this.handleCifraSelect.bind(this));

        // Evento Select2: Deseleção
        $(this.elements.cifraSelect).on('select2:clear', this.clearCard.bind(this));
    }

    handleCifraSelect(e) {
        const index = parseInt(e.params.data.id);
        this.selectedCifraIndex = index;
        this.loadCard(this.cifras[index]);
    }

    clearCard() {
        this.selectedCifraIndex = -1;
        this.elements.editCard.classList.add('d-none');
        this.elements.saveBtn.classList.add('d-none');
        this.elements.deleteBtn.classList.add('d-none');

        // Limpar todos os campos do card
        this.elements.editId.value = '';
        this.elements.editTitulo.value = '';
        this.elements.editArtista.value = '';
        this.elements.editCifra.value = '';
        this.elements.cardTitle.textContent = '';
    }

    loadCard(cifra) {
        if (!cifra) {
            this.clearCard();
            return;
        }

        this.elements.cardTitle.textContent = `${cifra.titulo} - ${cifra.artista ?? ''}`;
        this.elements.editId.value = cifra.id || '';
        this.elements.editTitulo.value = cifra.titulo || '';
        this.elements.editArtista.value = cifra.artista || '';
        this.elements.editCifra.value = cifra.cifra || '';

        this.elements.editCard.classList.remove('d-none');
        this.elements.saveBtn.classList.remove('d-none');
        this.elements.deleteBtn.classList.remove('d-none');
    }

    handleCardInputChange() {
        if (this.selectedCifraIndex === -1) return;

        // Salva a alteração diretamente no array 'cifras' para persistência
        const cifra = this.cifras[this.selectedCifraIndex];
        cifra.titulo = this.elements.editTitulo.value;
        cifra.artista = this.elements.editArtista.value;
        cifra.cifra = this.elements.editCifra.value;

        this.elements.cardTitle.textContent = `${cifra.titulo} - ${cifra.artista ?? ''}`;

        // Atualiza o Select2 para refletir a mudança no título
        const newText = `${cifra.titulo} - ${cifra.artista ?? ''}`;
        const option = $(this.elements.cifraSelect).find(`option[value='${this.selectedCifraIndex}']`);
        option.text(newText);
        // Dispara o evento Select2 para re-renderizar o texto selecionado
        $(this.elements.cifraSelect).trigger('change.select2');

        // Salva localmente a cada input
        this.saveLocalCifras();
    }

    saveCurrentCifra() {
        this.saveLocalCifras();
        this.clearCard();
        $(this.elements.cifraSelect).select2('destroy');
        this.setupSelect2();
    }

    clearCifras() {
        if (!confirm('Tem certeza que deseja excluir TODAS as cifras? Esta ação é irreversível e afetará APENAS seus dados locais (localStorage).')) {
            return;
        }

        this.cifras = [];
        this.saveLocalCifras();
        this.clearCard();
        $(this.elements.cifraSelect).select2('destroy');
        this.setupSelect2();
    }

    addCifra() {
        let maxId = this.cifras.length > 0 ? Math.max(...this.cifras.map(c => c.id || 0)) : 0;
        const newCifra = {
            id: maxId + 1,
            artista: 'Novo Artista',
            titulo: 'Nova Cifra',
            cifra: '// Insira sua cifra aqui'
        };
        this.cifras.push(newCifra);

        // Atualiza Select2 com a nova cifra
        const newIndex = this.cifras.length - 1;
        const newOption = new Option(`${newCifra.titulo} - ${newCifra.artista ?? ''}`, newIndex, true, true);
        $(this.elements.cifraSelect).append(newOption).trigger('change');

        this.selectedCifraIndex = newIndex;
        this.loadCard(newCifra);
    }

    deleteSelectedCifra() {
        if (this.selectedCifraIndex === -1 || !confirm('Tem certeza que deseja excluir esta cifra?')) {
            return;
        }

        // 1. Guarda o índice antes de limpar
        const indexToRemove = this.selectedCifraIndex;

        // 2. Remove do array
        this.cifras.splice(indexToRemove, 1);
        this.saveLocalCifras();

        this.clearCard();
        $(this.elements.cifraSelect).select2('destroy');
        this.setupSelect2();
    }

    removerAcentos(str) {
        if (!str) return "";
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    saveLocalCifras() {
        localStorage.setItem(this.LOCAL_KEY, JSON.stringify(this.cifras));
    }

    loadLocalCifras() {
        const local = localStorage.getItem(this.LOCAL_KEY);
        if (local) {
            try {
                return JSON.parse(local);
            } catch {
                return null;
            }
        }
        return null;
    }

    async loadCifras() {
        let remoteCifras = [];
        try {
            const response = await fetch(this.url);
            if (!response.ok) throw new Error('Erro ao carregar cifras.json');
            remoteCifras = await response.json();
        } catch (e) {
            alert('Erro ao carregar cifras.json remoto. Usando dados locais.');
            remoteCifras = [];
        }

        const localCifras = this.loadLocalCifras();

        if (localCifras && JSON.stringify(localCifras) !== JSON.stringify(remoteCifras)) {
            this.cifras = localCifras;
        } else {
            this.cifras = remoteCifras;
            this.saveLocalCifras();
        }
    }

    uploadJson() {
        // Simula o clique no input de arquivo oculto
        this.elements.importFileInput.click();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (!Array.isArray(importedData)) {
                    alert('Arquivo inválido: o JSON importado deve ser um array de cifras.');
                    return;
                }

                this.cifrasToImport = importedData;
                this.renderImportCards();

                // Reseta o input de arquivo para permitir a seleção do mesmo arquivo novamente
                this.elements.importFileInput.value = '';

            } catch (err) {
                alert(`Erro ao processar o arquivo JSON: ${err.message}`);
            }
        };
        reader.readAsText(file);
    }

    renderImportCards() {
        const container = this.elements.importContainer;
        container.innerHTML = '';

        if (this.cifrasToImport.length === 0) return;

        // Oculta a interface principal
        this.elements.editCard.classList.add('d-none');
        this.elements.saveBtn.classList.add('d-none');
        this.elements.deleteBtn.classList.add('d-none');

        const cardListHTML = this.cifrasToImport.map((item, index) => {
            const title = item.titulo || 'Sem Título';
            const artist = item.artista || '';

            // Gera o card de visualização para as cifras importadas
            return `
            <div class="card cifras-card shadow-sm mb-3" data-import-idx="${index}">
                <div class="card-body">
                    <h5 class="card-title text-warning">${title} - ${artist}</h5>
                    <p class="card-text text-muted" style="white-space: pre-wrap; max-height: 100px; overflow: hidden;">${item.chords || 'Cifra Vazia'}</p>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-sm btn-success mr-2" data-action="import-add" data-import-idx="${index}">Adicionar</button>
                        <button class="btn btn-sm btn-secondary" data-action="import-ignore" data-import-idx="${index}">Ignorar</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        container.innerHTML = `
        <h3>Cifras Importadas (${this.cifrasToImport.length})</h3>
        ${cardListHTML}
        <div class="text-center mt-3 mb-5">
            <button id="import-all-btn" class="btn btn-success btn-action" data-action="import-all">Adicionar Todas</button>
            <button id="cancel-import-btn" class="btn btn-danger btn-action" data-action="import-cancel">Cancelar Importação</button>
        </div>
    `;
    }

    handleImportCardAction(e) {
        const action = e.target.getAttribute('data-action');
        const importIdx = e.target.getAttribute('data-import-idx');

        if (!action) return;

        if (action === 'import-add') {
            this.addCifraFromImport(parseInt(importIdx));
        } else if (action === 'import-ignore') {
            this.cifrasToImport.splice(parseInt(importIdx), 1);
            this.renderImportCards();
        } else if (action === 'import-all') {
            this.cifrasToImport.forEach(() => this.addCifraFromImport(0, false)); // Adiciona o primeiro item, o array encolhe
            this.finishImport();
        } else if (action === 'import-cancel') {
            this.finishImport();
        }
    }

    addCifraFromImport(importIndex, reRender = true) {
        const importedCifra = this.cifrasToImport[importIndex];

        // 1. Gera um novo ID e adiciona ao array principal
        let maxId = this.cifras.length > 0 ? Math.max(...this.cifras.map(c => c.id || 0)) : 0;
        const newCifra = { ...importedCifra, id: maxId + 1 };

        this.cifras.push(newCifra);

        // 2. Remove do array de importação
        this.cifrasToImport.splice(importIndex, 1);

        this.saveLocalCifras();

        // 3. Re-renderiza a lista de importação
        if (reRender) {
            if (this.cifrasToImport.length === 0) {
                this.finishImport();
            } else {
                this.renderImportCards();
            }
        }
    }

    finishImport() {
        this.cifrasToImport = [];
        this.elements.importContainer.innerHTML = '';

        // Re-inicializa o Select2 com os novos dados
        $(this.elements.cifraSelect).select2('destroy');
        this.setupSelect2();

        // Limpa o card e re-habilita a interface de edição
        this.clearCard();

        alert('Importação finalizada com sucesso! Lista atualizada.');
    }

    downloadJson() {
        const json = JSON.stringify(this.cifras, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'cifras.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    new CifrasEditor().init();
});