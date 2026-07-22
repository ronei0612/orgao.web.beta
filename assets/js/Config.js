class AppConfig {
    static get isLocal() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    static getAssetURL(relativePath) {
        return this.isLocal ? `./${relativePath}` : `https://roneicostasoares.com.br/orgao.web.beta/${relativePath}`;
    }

    static get audioBaseURL() {
        return this.getAssetURL('assets/audio/');
    }

    static get translationsURL() {
        return this.getAssetURL('translations.json');
    }

    static get stylesMelodyURL() {
        return this.getAssetURL('styles-melody.json');
    }
}
