class LocalStorageManager {
    constructor() { }

    getSavesJson(name) {
        try {
            const savesString = localStorage.getItem(name);
            return savesString ? JSON.parse(savesString) : {};
        } catch (error) {
            console.error("Erro ao ler saves do localStorage:", error);
            return {};
        }
    }

    getSaveJson(name, item) {
        const saves = this.getSavesJson(name);
        const conteudo = saves[item];
        return conteudo ?? null;
    }

    saveJson(name, item, conteudo) {
        const saves = this.getSavesJson(name);
        saves[item] = conteudo;
        this.save(name, JSON.stringify(saves));
    }

    save(name, conteudo) {
        localStorage.setItem(name, conteudo);
    }

    deleteJson(name, item) {
        const saves = this.getSavesJson(name);
        delete saves[item];
        this.save(name, JSON.stringify(saves));
    }

    editarNome(name, oldName, newName) {
        const saves = this.getSavesJson(name);
        if (saves.hasOwnProperty(oldName)) {
            const content = saves[oldName];
            delete saves[oldName];
            saves[newName] = content;
            this.save(name, JSON.stringify(saves));
            return true;
        } else {
            console.warn(`editarNomeSaveLocalStorage: Save com o nome "${oldName}" não encontrado.`);
            return false;
        }
    }

    getText(name) {
        const texto = localStorage.getItem(name);
        return texto ?? '';
    }

    getTextJson(name, item) {
        const saves = this.getSavesJson(name);
        const texto = saves[item];
        return texto ?? '';
    }
}

