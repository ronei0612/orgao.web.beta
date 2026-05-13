class StyleManager {
    constructor(storageKey, selectElement, defaultStyle, hasBlankOption, createEmptyPatternCallback, reloadCallback) {
        this.storageKey = storageKey;
        this.selectElement = selectElement;
        this.defaultStyle = defaultStyle;
        this.hasBlankOption = hasBlankOption;
        this.createEmptyPatternCallback = createEmptyPatternCallback;
        this.reloadCallback = reloadCallback;
    }

    getStorageData(fallbackStyles) {
        const data = localStorage.getItem(this.storageKey);
        if (data) return JSON.parse(data);
        return fallbackStyles || { styles: [], data: {} };
    }

    persistStorageData(obj) {
        localStorage.setItem(this.storageKey, JSON.stringify(obj));
    }

    loadStyles(fallbackStyles) {
        const storage = this.getStorageData(fallbackStyles);
        const styles = storage.styles || [];
        this.selectElement.innerHTML = '';

        if (this.hasBlankOption) {
            const blankOption = document.createElement('option');
            blankOption.value = "";
            blankOption.textContent = "Sem ritmo";
            this.selectElement.appendChild(blankOption);
        }

        if (!styles.length) {
            if (this.defaultStyle) {
                const option = document.createElement('option');
                option.value = this.defaultStyle;
                option.textContent = this.defaultStyle;
                this.selectElement.appendChild(option);
                this.selectElement.value = this.defaultStyle;
            }
            return;
        }

        const sorted = styles.slice().sort((a, b) => a.localeCompare(b));
        sorted.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = s;
            this.selectElement.appendChild(option);
        });

        this.selectElement.selectedIndex = 0;
    }

    addStyle(numSteps, extraKeys = []) {
        const newName = prompt('Digite o nome do novo estilo:');
        if (!newName) return;
        const storage = this.getStorageData();
        if ((storage.styles || []).includes(newName)) {
            alert('Este nome de estilo já existe.');
            return;
        }
        if (!storage.styles) storage.styles = [];
        storage.styles.push(newName);
        if (!storage.data) storage.data = {};
        storage.data[newName] = {};

        // Para BateriaUI (A, B, C, D e fills), ou MelodyUI (apenas o base)
        if (extraKeys.length > 0) {
            extraKeys.forEach(r => {
                storage.data[newName][r] = this.createEmptyPatternCallback(numSteps);
                storage.data[newName][`${r}-fill`] = this.createEmptyPatternCallback(numSteps);
            });
        } else {
            storage.data[newName] = this.createEmptyPatternCallback(numSteps);
        }

        this.persistStorageData(storage);
        this.loadStyles();
        this.selectElement.value = newName;
        if (this.reloadCallback) this.reloadCallback(newName);
    }

    editStyle() {
        const current = this.selectElement.value;
        if (!current) return;
        const newName = prompt('Digite o novo nome para o estilo:', current);
        if (!newName || newName === current) return;
        const storage = this.getStorageData();
        if ((storage.styles || []).includes(newName)) {
            alert('Este nome de estilo já existe.');
            return;
        }
        const idx = storage.styles.indexOf(current);
        if (idx !== -1) storage.styles[idx] = newName;

        if (storage.data && storage.data[current]) {
            storage.data[newName] = storage.data[current];
            delete storage.data[current];
        } else {
            storage.data[newName] = {};
        }

        this.persistStorageData(storage);
        this.loadStyles();
        this.selectElement.value = newName;
        if (this.reloadCallback) this.reloadCallback(newName);
    }

    deleteStyle() {
        const current = this.selectElement.value;
        if (!current) return;
        if (!confirm(`Tem certeza que deseja excluir o estilo "${current}"?`)) return;
        const storage = this.getStorageData();
        storage.styles = (storage.styles || []).filter(s => s !== current);
        if (storage.data && storage.data[current]) delete storage.data[current];
        this.persistStorageData(storage);
        this.loadStyles();
        if (this.reloadCallback) this.reloadCallback(this.selectElement.value);
    }
}
