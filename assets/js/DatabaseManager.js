class DatabaseManager {
    constructor() {
        this.STORAGE_KEY = 'songs';
    }

    getSongs() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return [];
    }

    saveSongs(songs) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(songs));
    }

    addSong(title, content) {
        const songs = this.getSongs();
        // ID mais seguro (Time + String aleatória)
        const safeId = Date.now().toString() + Math.random().toString(36).substring(2, 6);

        const newSong = { id: safeId, title, content };
        songs.push(newSong);
        this.saveSongs(songs);

        return newSong;
    }

    updateSong(id, title, content) {
        const songs = this.getSongs();
        const index = songs.findIndex(s => s.id === id);

        if (index > -1) {
            songs[index] = { ...songs[index], title, content };
            this.saveSongs(songs);
            return songs[index];
        }
        return null;
    }

    deleteSong(id) {
        let songs = this.getSongs();
        songs = songs.filter(s => s.id !== id);
        this.saveSongs(songs);
    }

    getSongById(id) {
        const songs = this.getSongs();
        return songs.find(s => s.id === id);
    }

    // --- NOVA REGRA DE NEGÓCIO ---
    // Verifica se já existe uma música com este título (ignorando a si mesma na edição)
    titleExists(title, excludeId = null) {
        const songs = this.getSongs();
        return songs.some(song => {
            const hasSameName = song.title.toLowerCase() === title.toLowerCase();
            const isDifferentSong = song.id !== excludeId;
            return hasSameName && isDifferentSong;
        });
    }
}