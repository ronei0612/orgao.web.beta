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

        let loadedImportSongs = [];

        modalEl.addEventListener('hidden.bs.modal', () => {
            fileInput.value = '';
            selectionArea.classList.add('d-none');
            btnConfirm.classList.add('d-none');
            loadedImportSongs = [];
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    loadedImportSongs = JSON.parse(event.target.result);
                    importList.innerHTML = '';

                    loadedImportSongs.forEach((song, index) => {
                        importList.innerHTML += `
                            <div class="form-check">
                                <input class="form-check-input import-cb" type="checkbox" value="${index}" checked>
                                <label class="form-check-label">${song.title}</label>
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
            const selectedIndexes = Array.from(document.querySelectorAll('.import-cb:checked')).map(cb => parseInt(cb.value, 10));
            const songsToImport = loadedImportSongs.filter((song, index) => selectedIndexes.includes(index));

            const currentSongs = this.db.getSongs();
            songsToImport.forEach(song => {
                song.id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
                currentSongs.push(song);
            });

            this.db.saveSongs(currentSongs);
            if (this.onImportComplete) this.onImportComplete();

            bootstrap.Modal.getInstance(modalEl).hide();
            alert(`${songsToImport.length} música(s) importada(s) com sucesso!`);
        });
    }
}