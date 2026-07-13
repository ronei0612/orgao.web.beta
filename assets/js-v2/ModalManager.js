class ModalManager {
    constructor(preferencesManager) {
        this.prefs = preferencesManager;

        this.modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        this.titleEl = document.getElementById('confirmModalTitle');
        this.bodyEl = document.getElementById('confirmModalBody');

        this.btnNo = document.getElementById('btn-confirm-no');
        this.btnYes = document.getElementById('btn-confirm-yes');
    }

    show(titleKey, bodyKey, onConfirmCallback, showCancelButton = true) {
        // Puxa as traduções do PreferencesManager
        const dict = this.prefs.translations[this.prefs.currentLang] || {};

        this.titleEl.innerText = dict[titleKey] || titleKey;
        this.bodyEl.innerText = dict[bodyKey] || bodyKey;
        this.btnNo.innerText = dict['no'] || 'Não';

        if (showCancelButton) {
            this.btnNo.classList.remove('d-none');
            this.btnYes.innerText = dict['yes'] || 'Sim';
        } else {
            this.btnNo.classList.add('d-none');
            this.btnYes.innerText = 'OK';
        }

        // Clona o botão YES para remover eventListeners antigos (evita cliques múltiplos/fantasma)
        const newBtnYes = this.btnYes.cloneNode(true);
        this.btnYes.parentNode.replaceChild(newBtnYes, this.btnYes);
        this.btnYes = newBtnYes;

        this.btnYes.addEventListener('click', () => {
            this.modal.hide();
            if (onConfirmCallback) {
                onConfirmCallback();
            }
        });

        this.modal.show();
    }
}