document.addEventListener('DOMContentLoaded', () => {

    // 1. Instanciamento dos Gerenciadores
    // Usa uma chave exclusiva para o Rascunho (Não afeta o index.html)
    const db = new DatabaseManager('cifras_draft');
    const backupManager = new BackupManager(db);

    // 2. Elementos DOM
    const inputTitle = document.getElementById('edit-titulo');
    const inputArtist = document.getElementById('edit-artista');
    const inputContent = document.getElementById('edit-cifra'); // Agora é uma div
    const btnSave = document.getElementById('btn-save');
    const btnAdd = document.getElementById('btn-add');
    const btnDelete = document.getElementById('btn-delete');
    const btnClearAll = document.getElementById('btn-clear-all');

    let currentId = null;

    // 3. Impedir colagem de HTML formatado (Força "Colar como texto")
    inputContent.addEventListener('paste', (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const text = clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    });

    // 4. Inicializa o TomSelect
    const ts = new TomSelect("#cifra-select", {
        create: false,
        sortField: { field: "text", direction: "asc" },
        placeholder: "Selecione um rascunho...",
        allowEmptyOption: true
    });

    function refreshSelect() {
        ts.clear(true);
        ts.clearOptions();
        ts.addOption({ value: '', text: 'Selecione um rascunho...' });

        db.getSongs().forEach(song => {
            const artistStr = song.artist ? ` - ${song.artist}` : '';
            ts.addOption({ value: song.id, text: `${song.title}${artistStr}` });
        });

        if (currentId) {
            ts.setValue(currentId, true);
        }
    }

    backupManager.onImportComplete = () => {
        currentId = null;
        clearEditor();
        refreshSelect();
    };

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

            // MUDANÇA AQUI: Usa a inteligência antes de jogar na tela do Editor
            inputContent.innerHTML = TextFormatter.prepareContent(song.content || '');

            btnDelete.classList.remove('d-none');
        }
    });

    function clearEditor() {
        currentId = null;
        inputTitle.value = '';
        inputArtist.value = '';
        inputContent.innerHTML = '';
        ts.setValue('', true);
        btnDelete.classList.add('d-none');
        inputTitle.focus();
    }

    btnAdd.addEventListener('click', () => clearEditor());

    // 5. Salvar usando o TextFormatter
    btnSave.addEventListener('click', () => {
        const title = inputTitle.value.trim();
        const artist = inputArtist.value.trim();

        // Formata os acordes (bota negrito e limpa as tags das partituras invisíveis)
        const content = TextFormatter.processEditorData(inputContent);

        if (!title) {
            alert('O título da música é obrigatório!');
            return;
        }

        if (db.titleExists(title, currentId)) {
            alert('Já existe um rascunho com este título. Escolha outro.');
            return;
        }

        if (currentId) {
            const saved = db.updateSong(currentId, title, content, artist);
            inputContent.innerHTML = saved.content; // Atualiza a tela com o HTML processado (com os negritos)
            alert('Rascunho atualizado com sucesso!');
        } else {
            const newSong = db.addSong(title, content, artist);
            currentId = newSong.id;
            inputContent.innerHTML = newSong.content;
            alert('Rascunho adicionado com sucesso!');
        }

        refreshSelect();
    });

    btnDelete.addEventListener('click', () => {
        if (!currentId) return;

        if (confirm('Tem certeza de que deseja EXCLUIR este rascunho?')) {
            db.deleteSong(currentId);
            clearEditor();
            refreshSelect();
        }
    });

    btnClearAll.addEventListener('click', () => {
        if (confirm('⚠️ ATENÇÃO! Tem certeza que deseja apagar TODOS os seus rascunhos?')) {
            db.saveSongs([]);
            clearEditor();
            refreshSelect();
            alert('Rascunhos apagados com sucesso.');
        }
    });

    // 6. Controle do Tema (Dark/Light Mode)
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
            document.querySelector('.text-teal').style.color = '#0b8e8e';
        } else {
            iconTheme.classList.replace('bi-sun-fill', 'bi-moon-fill');
            iconTheme.style.color = "";
        }
    }

    // Disparo inicial
    refreshSelect();
});