class DatabaseManager {
    // Agora aceita a chave como parâmetro!
    constructor(storageKey = 'songs') {
        this.STORAGE_KEY = storageKey;
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

    addSong(title, content, artist = '', key = 'C', bpm = 90, instrument = 'orgao', style = 'none') {
        const songs = this.getSongs();
        const safeId = Date.now().toString() + Math.random().toString(36).substring(2, 6);

        const newSong = { id: safeId, title, artist, content, key, bpm, instrument, style };
        songs.push(newSong);
        this.saveSongs(songs);

        return newSong;
    }

    updateSong(id, title, content, artist = '', key = 'C', bpm = 90, instrument = 'orgao', style = 'none') {
        const songs = this.getSongs();
        const index = songs.findIndex(s => s.id === id);

        if (index > -1) {
            songs[index] = {
                ...songs[index],
                title,
                artist,
                content,
                key,
                bpm,
                instrument,
                style
            };
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

    titleExists(title, excludeId = null) {
        const songs = this.getSongs();
        return songs.some(song => {
            const hasSameName = song.title.toLowerCase() === title.toLowerCase();
            const isDifferentSong = song.id !== excludeId;
            return hasSameName && isDifferentSong;
        });
    }
}