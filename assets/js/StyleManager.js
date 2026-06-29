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
        const dataStr = localStorage.getItem(this.storageKey);

        let parsed = null;
        if (dataStr) {
            parsed = JSON.parse(dataStr);
        } else if (fallbackStyles) {
            parsed = fallbackStyles;
        }

        // MÁGICA DA MIGRAÇÃO: Converte o formato antigo (styles/data) para o formato plano
        if (parsed && typeof parsed === 'object' && parsed.data && Array.isArray(parsed.styles)) {
            parsed = parsed.data;
            if (dataStr) this.persistStorageData(parsed); // Salva no localstorage o formato limpo
        }

        return parsed || {};
    }

    persistStorageData(obj) {
        localStorage.setItem(this.storageKey, JSON.stringify(obj));
    }

    loadStyles(fallbackStyles) {
        const storage = this.getStorageData(fallbackStyles);

        // Lê as chaves diretamente do objeto raiz (Adeus array e adeus .data!)
        const stylesNames = Object.keys(storage || {});

        this.selectElement.innerHTML = '';

        if (this.hasBlankOption) {
            const blankOption = document.createElement('option');
            blankOption.value = "";
            blankOption.textContent = "Sem ritmo";
            this.selectElement.appendChild(blankOption);
        }

        if (!stylesNames.length) {
            if (this.defaultStyle) {
                const option = document.createElement('option');
                option.value = this.defaultStyle;
                option.textContent = this.defaultStyle;
                this.selectElement.appendChild(option);
                this.selectElement.value = this.defaultStyle;
            }
            return;
        }

        const sorted = stylesNames.sort((a, b) => a.localeCompare(b));
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

        if (storage[newName]) {
            alert('Este nome de estilo já existe.');
            return;
        }

        if (extraKeys.length > 0) {
            storage[newName] = {};
            extraKeys.forEach(r => {
                storage[newName][r] = this.createEmptyPatternCallback(numSteps);
                storage[newName][`${r}-fill`] = this.createEmptyPatternCallback(numSteps);
            });
        } else {
            storage[newName] = this.createEmptyPatternCallback(numSteps);
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

        if (storage[newName]) {
            alert('Este nome de estilo já existe.');
            return;
        }

        if (storage[current]) {
            storage[newName] = storage[current];
            delete storage[current];
        } else {
            storage[newName] = {};
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
        if (storage[current]) {
            delete storage[current];
        }

        this.persistStorageData(storage);
        this.loadStyles();
        if (this.reloadCallback) this.reloadCallback(this.selectElement.value);
    }
}