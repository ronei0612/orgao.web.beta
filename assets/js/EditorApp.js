document.addEventListener('DOMContentLoaded', () => {

    // 1. Instanciamento dos Gerenciadores
    const db = new DatabaseManager();
    const backupManager = new BackupManager(db);

    // 2. Elementos DOM
    const inputTitle = document.getElementById('edit-titulo');
    const inputArtist = document.getElementById('edit-artista');
    const inputContent = document.getElementById('edit-cifra');
    const btnSave = document.getElementById('btn-save');
    const btnAdd = document.getElementById('btn-add');
    const btnDelete = document.getElementById('btn-delete');
    const btnClearAll = document.getElementById('btn-clear-all');

    let currentId = null;

    // 3. Inicializa o TomSelect
    const ts = new TomSelect("#cifra-select", {
        create: false,
        sortField: { field: "text", direction: "asc" },
        placeholder: "Selecione uma música para editar...",
        allowEmptyOption: true
    });

    // 4. Lógica de Atualização da Lista
    function refreshSelect() {
        ts.clear(true);
        ts.clearOptions();
        ts.addOption({ value: '', text: 'Selecione uma música para editar...' });

        db.getSongs().forEach(song => {
            const artistStr = song.artist ? ` - ${song.artist}` : '';
            ts.addOption({ value: song.id, text: `${song.title}${artistStr}` });
        });

        if (currentId) {
            ts.setValue(currentId, true);
        }
    }

    // Se o BackupManager importar algo, atualiza a lista!
    backupManager.onImportComplete = () => {
        currentId = null;
        clearEditor();
        refreshSelect();
    };

    // 5. Ao selecionar uma música na caixa de pesquisa
    ts.on('change', (val) => {
        if (!val) {
            clearEditor();
            return;
        }

        const song = db.getSongById(val);
        if (song) {
            currentId = song.id;
            inputTitle.value = song.title || '';
            inputArtist.value = song.artist || '';
            inputContent.value = song.content || '';
            btnDelete.classList.remove('d-none');
        }
    });

    // 6. Limpar o Editor (Modo "Nova Música")
    function clearEditor() {
        currentId = null;
        inputTitle.value = '';
        inputArtist.value = '';
        inputContent.value = '';
        ts.setValue('', true);
        btnDelete.classList.add('d-none');
        inputTitle.focus();
    }

    btnAdd.addEventListener('click', () => {
        clearEditor();
    });

    // 7. Salvar (Novo ou Update)
    btnSave.addEventListener('click', () => {
        const title = inputTitle.value.trim();
        const artist = inputArtist.value.trim();
        const content = inputContent.value;

        if (!title) {
            alert('O título da música é obrigatório!');
            return;
        }

        // Verifica duplicidade usando o novo DatabaseManager
        if (db.titleExists(title, currentId)) {
            alert('Já existe uma música cadastrada com este título. Escolha outro.');
            return;
        }

        if (currentId) {
            db.updateSong(currentId, title, content, artist);
            alert('Música atualizada com sucesso!');
        } else {
            const newSong = db.addSong(title, content, artist);
            currentId = newSong.id;
            alert('Música adicionada com sucesso!');
        }

        refreshSelect();
    });

    // 8. Excluir Música Atual
    btnDelete.addEventListener('click', () => {
        if (!currentId) return;

        if (confirm('Tem certeza de que deseja EXCLUIR esta música?')) {
            db.deleteSong(currentId);
            clearEditor();
            refreshSelect();
        }
    });

    // 9. Excluir Todo o Repertório
    btnClearAll.addEventListener('click', () => {
        if (confirm('⚠️ ATENÇÃO! Tem certeza que deseja apagar TODO o seu repertório? Essa ação é irreversível.')) {
            db.saveSongs([]);
            clearEditor();
            refreshSelect();
            alert('Repertório apagado com sucesso.');
        }
    });

    // 10. Controle do Tema (Dark/Light Mode)
    const btnTheme = document.getElementById('btn-theme-toggle');
    const iconTheme = document.getElementById('icon-theme');
    const htmlEl = document.documentElement;

    const currentTheme = localStorage.getItem('theme') || 'light';
    setTheme(currentTheme === 'dark');

    btnTheme.addEventListener('click', () => {
        const isDark = htmlEl.getAttribute('data-bs-theme') === 'dark';
        setTheme(!isDark);
    });

    function setTheme(isDark) {
        const theme = isDark ? 'dark' : 'light';
        htmlEl.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);

        if (isDark) {
            iconTheme.classList.replace('bi-moon-fill', 'bi-sun-fill');
            iconTheme.style.color = "#ffc107";
            document.querySelector('.text-teal').style.color = '#0b8e8e'; // Ajuste p/ dark
        } else {
            iconTheme.classList.replace('bi-sun-fill', 'bi-moon-fill');
            iconTheme.style.color = "";
        }
    }

    // Disparo inicial
    refreshSelect();
});