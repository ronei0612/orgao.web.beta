class BackupManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.onImportComplete = null;

        this.initExport();
        this.initImport();
    }

    // --- EXPORTAR ---
    initExport() {
        const modalEl = document.getElementById('exportModal');
        const exportList = document.getElementById('export-list');
        const exportSelectAll = document.getElementById('export-select-all');
        const btnConfirm = document.getElementById('btn-confirm-export');

        if (!modalEl) return;

        modalEl.addEventListener('show.bs.modal', () => {
            exportList.innerHTML = '';
            const songs = this.db.getSongs();

            songs.forEach(song => {
                exportList.innerHTML += `
                    <div class="form-check">
                        <input class="form-check-input export-cb" type="checkbox" value="${song.id}" checked>
                        <label class="form-check-label">${song.title}</label>
                    </div>`;
            });
            exportSelectAll.checked = true;
        });

        exportSelectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.export-cb').forEach(cb => cb.checked = e.target.checked);
        });

        btnConfirm.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.export-cb:checked')).map(cb => cb.value);
            const songsToExport = this.db.getSongs().filter(song => selectedIds.includes(song.id));

            const blob = new Blob([JSON.stringify(songsToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');

            anchor.href = url;
            anchor.download = `repertorio_${new Date().toISOString().split('T')[0]}.json`;
            anchor.click();

            URL.revokeObjectURL(url);
            bootstrap.Modal.getInstance(modalEl).hide();
        });
    }

    // --- IMPORTAR ---
    initImport() {
        const modalEl = document.getElementById('importModal');
        const fileInput = document.getElementById('import-file-input');
        const selectionArea = document.getElementById('import-selection-area');
        const importList = document.getElementById('import-list');
        const selectAll = document.getElementById('import-select-all');
        const btnConfirm = document.getElementById('btn-confirm-import');

        if (!modalEl) return;

        let analyzedSongs = []; // Vai guardar o status (Nova ou Substituir)

        modalEl.addEventListener('hidden.bs.modal', () => {
            fileInput.value = '';
            selectionArea.classList.add('d-none');
            btnConfirm.classList.add('d-none');
            analyzedSongs = [];
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedImportSongs = JSON.parse(event.target.result);
                    const currentSongs = this.db.getSongs();
                    importList.innerHTML = '';
                    analyzedSongs = [];

                    loadedImportSongs.forEach((incomingSong, index) => {
                        // Garante compatibilidade com seu JSON antigo
                        const title = incomingSong.title || incomingSong.titulo || 'Sem Título';
                        const artist = incomingSong.artist || incomingSong.artista || '';
                        const content = incomingSong.content || incomingSong.cifra || incomingSong.chords || '';

                        // Verifica se o título já existe no banco atual
                        const existingSong = currentSongs.find(s => s.title.toLowerCase() === title.toLowerCase());
                        const isUpdate = !!existingSong;
                        const existingId = isUpdate ? existingSong.id : null;

                        // Salva o objeto normalizado e analisado
                        analyzedSongs.push({
                            title, artist, content, isUpdate, existingId
                        });

                        // Cria a Tag visual (Badge)
                        const badge = isUpdate
                            ? `<span class="badge bg-warning text-dark ms-2"><i class="fas fa-sync-alt me-1"></i>Substituir</span>`
                            : `<span class="badge bg-success ms-2"><i class="fas fa-plus me-1"></i>Nova</span>`;

                        importList.innerHTML += `
                            <div class="form-check d-flex align-items-center mb-1">
                                <input class="form-check-input import-cb me-2" type="checkbox" value="${index}" checked>
                                <label class="form-check-label mb-0 flex-grow-1">${title} ${badge}</label>
                            </div>`;
                    });

                    selectionArea.classList.remove('d-none');
                    btnConfirm.classList.remove('d-none');
                    selectAll.checked = true;
                } catch (err) {
                    alert('Arquivo JSON inválido.');
                }
            };
            reader.readAsText(file);
        });

        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.import-cb').forEach(cb => cb.checked = e.target.checked);
        });

        btnConfirm.addEventListener('click', () => {
            // Pega os índices marcados na tela
            const selectedIndexes = Array.from(document.querySelectorAll('.import-cb:checked')).map(cb => parseInt(cb.value, 10));

            // Pega o banco atualizado
            const currentSongs = this.db.getSongs();

            selectedIndexes.forEach(index => {
                const analyzed = analyzedSongs[index];

                if (analyzed.isUpdate) {
                    // Substitui a música existente
                    const songIndex = currentSongs.findIndex(s => s.id === analyzed.existingId);
                    if (songIndex > -1) {
                        currentSongs[songIndex] = {
                            ...currentSongs[songIndex],
                            title: analyzed.title,
                            artist: analyzed.artist,
                            content: analyzed.content
                        };
                    }
                } else {
                    // Adiciona música nova
                    const safeId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
                    currentSongs.push({
                        id: safeId,
                        title: analyzed.title,
                        artist: analyzed.artist,
                        content: analyzed.content
                    });
                }
            });

            // Salva a lista final modificada no LocalStorage
            this.db.saveSongs(currentSongs);

            // Dispara o evento pra tela atualizar o combobox (TomSelect)
            if (this.onImportComplete) this.onImportComplete();

            bootstrap.Modal.getInstance(modalEl).hide();
            alert(`${selectedIndexes.length} música(s) importada(s) com sucesso!`);
        });
    }
}