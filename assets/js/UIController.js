class UIController {
    constructor(elements) {
        this.elements = elements;
    }

    exibirBotoesCifras() {
        this.elements.draggableControls.classList.add('draggable');
        this.elements.draggableControls.classList.add('control-panel');
        this.elements.notesButton.classList.remove('d-none');
        this.elements.playButton.classList.remove('d-none');
        this.elements.notesButton.classList.remove('mx-2');
        this.elements.notesButton.classList.add('ml-3');
        this.elements.playButton.classList.add('mx-5');
        this.esconderBotoesAcordes();
    }

    esconderBotoesAvancarVoltarCifra() {
        this.elements.retrocederButton.classList.remove('fade-in');
        this.elements.retrocederButton.classList.add('d-none');
        this.elements.avancarButton.classList.remove('fade-in');
        this.elements.avancarButton.classList.add('d-none');
        this.elements.notesButton.classList.remove('mx-2');
        this.elements.notesButton.classList.add('ml-3');
        this.elements.playButton.classList.add('mx-5');
        this.elements.draggableControls.classList.add('control-panel');
    }

    exibirBotoesAvancarVoltarCifra() {
        this.elements.retrocederButton.classList.remove('d-none');
        this.elements.retrocederButton.classList.add('fade-in');
        this.elements.avancarButton.classList.remove('d-none');
        this.elements.avancarButton.classList.add('fade-in');
        this.elements.notesButton.classList.remove('ml-3');
        this.elements.playButton.classList.remove('mx-5');
    }

    esconderBotoesAcordes() {
        this.elements.acorde1.classList.add('d-none');
        this.elements.acorde2.classList.add('d-none');
        this.elements.acorde3.classList.add('d-none');
        this.elements.acorde4.classList.add('d-none');
        this.elements.acorde5.classList.add('d-none');
        this.elements.acorde6.classList.add('d-none');
        this.elements.acorde7.classList.add('d-none');
        this.elements.acorde8.classList.add('d-none');
        this.elements.acorde9.classList.add('d-none');
        this.elements.acorde10.classList.add('d-none');
        this.elements.acorde11.classList.add('d-none');
    }

    editarMusica() {
        this.elements.iframeCifra.classList.add('d-none');
        this.elements.editTextarea.classList.remove('d-none');
        this.elements.selectContainer.classList.add('d-none');
        this.elements.itemNameInput.classList.remove('d-none');
        this.elements.saveButton.classList.remove('d-none');
        this.elements.cancelButton.classList.remove('d-none');
        this.elements.editSavesSelect.classList.add('d-none');
        this.elements.deleteSavesSelect.classList.add('d-none');
        this.elements.addButton.classList.add('d-none');
    }

    exibirBotoesAcordes() {
        this.exibirBotoesTom();
        this.elements.notesButton.classList.remove('d-none');
        this.elements.notesButton.classList.remove('ml-5');
        this.elements.playButton.classList.remove('mx-5');
        this.elements.notesButton.classList.add('mx-2');
        this.elements.playButton.classList.remove('d-none');
        this.elements.draggableControls.classList.remove('draggable');
        this.elements.draggableControls.classList.remove('control-panel');

        this.elements.acorde1.classList.remove('d-none');
        this.elements.acorde2.classList.remove('d-none');
        this.elements.acorde3.classList.remove('d-none');
        this.elements.acorde4.classList.remove('d-none');
        this.elements.acorde5.classList.remove('d-none');
        this.elements.acorde6.classList.remove('d-none');
        this.elements.acorde7.classList.remove('d-none');
        this.elements.acorde8.classList.remove('d-none');
        this.elements.acorde9.classList.remove('d-none');
        this.elements.acorde10.classList.remove('d-none');
        this.elements.acorde11.classList.remove('d-none');

        this.elements.acorde1.value = 'C';
        this.elements.acorde1.textContent = 'C';
        this.elements.acorde2.value = 'Am';
        this.elements.acorde2.textContent = 'Am';
        this.elements.acorde3.value = 'F';
        this.elements.acorde3.textContent = 'F';
        this.elements.acorde4.value = 'Dm';
        this.elements.acorde4.textContent = 'Dm';
        this.elements.acorde5.value = 'G';
        this.elements.acorde5.textContent = 'G';
        this.elements.acorde6.value = 'Em';
        this.elements.acorde6.textContent = 'Em';
        this.elements.acorde7.value = 'A';
        this.elements.acorde7.textContent = 'A';
        this.elements.acorde8.value = 'E';
        this.elements.acorde8.textContent = 'E';
        this.elements.acorde9.value = 'Bb';
        this.elements.acorde9.textContent = 'Bb';
        this.elements.acorde10.value = 'D';
        this.elements.acorde10.textContent = 'D';
        this.elements.acorde11.value = 'B°';
        this.elements.acorde11.textContent = 'B°';
    }

    esconderBotoesTom() {
        this.elements.tomSelect.innerHTML = '<option value="">Letra</option>';
        this.elements.tomContainer.classList.remove('d-flex');
        this.elements.tomContainer.classList.add('d-none');
    }

    exibirBotoesTom() {
        this.elements.tomContainer.classList.remove('d-none');
        this.elements.tomContainer.classList.add('d-flex');
    }

    desabilitarSelectSaves() {
        this.elements.savesSelect.disabled = true;
        this.elements.addButton.disabled = true;
    }

    habilitarSelectSaves() {
        this.elements.savesSelect.disabled = false;
        this.elements.addButton.disabled = false;
    }

    exibirBotaoPlay() {
        this.elements.playButton.classList.remove('d-none', 'pressed');
        this.elements.stopButton.classList.add('d-none', 'pulse');
        this.resetAnimacaoRitmo();
    }

    exibirBotaoStop() {
        this.elements.playButton.classList.add('d-none');
        this.elements.stopButton.classList.remove('d-none');
    }

    exibirListaSaves(saveSelected) {
        this.elements.addButton.classList.add('rounded-right-custom');
        this.elements.addButton.classList.remove('rounded-0');
        this.elements.deleteSavesSelect.classList.add('d-none');
        this.elements.editSavesSelect.classList.add('d-none');

        this.elements.savesSelect.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Selecione uma Música...';
        defaultOption.selected = true;
        defaultOption.hidden = true;
        this.elements.savesSelect.appendChild(defaultOption);

        const emptyOption = document.createElement('option');
        emptyOption.value = 'acordes__';
        emptyOption.text = 'Acordes';
        this.elements.savesSelect.appendChild(emptyOption);

        this.elements.savesSelect.style.color = '';

        let saves = localStorage.getItem('saves');
        if (saves && saves !== '{}') {
            saves = JSON.parse(saves);

            let saveNames = Object.keys(saves).sort();

            saveNames.forEach(saveName => {
                const listItem = this.criarItemSelect(saveName, saves[saveName]);
                this.elements.savesSelect.appendChild(listItem);
            });

            if (saveSelected && saveNames.includes(saveSelected)) {
                this.elements.savesSelect.value = saveSelected;
                this.elements.savesSelect.style.color = 'black';
            }
        }
    }

    esconderElementosBateria() {
        this.elements.orgaoInstrumentButton.classList.remove('d-none');
        this.elements.bateriaInstrumentButton.classList.add('d-none');
        this.elements.bateriaWrapper.classList.add('d-none');
        this.elements.rhythmButtonsControl.classList.add('d-none');
        this.elements.playButton.classList.remove('blinking');
        this.elements.drumStyleSelect.classList.add('d-none');
        this.exibirElementosMelody();
    }

    exibirElementosBateria() {
        this.elements.orgaoInstrumentButton.classList.add('d-none');
        this.elements.bateriaInstrumentButton.classList.remove('d-none');
        this.elements.bateriaWrapper.classList.remove('d-none');
        this.elements.rhythmButtonsControl.classList.remove('d-none');
        this.elements.playButton.classList.add('blinking');
        this.elements.drumStyleSelect.classList.remove('d-none');
        this.esconderElementosMelody();
    }

    esconderElementosMelody() {
        this.elements.melodyWrapper.classList.add('d-none');
    }

    exibirElementosMelody() {
        this.elements.melodyWrapper.classList.remove('d-none');
        this.elements.melodyStyleSelect.classList.remove('d-none');
    }

    esconderBotoesPlay() {
        this.elements.draggableControls.classList.remove('draggable');
        this.elements.notesButton.classList.add('d-none');
        this.elements.playButton.classList.add('d-none');
    }

    criarItemSelect(saveName, saveContent) {
        const option = document.createElement('option');

        option.value = saveName;
        option.textContent = saveName;

        this.elements.savesSelect.appendChild(option);
        return option;
    }

    ritmoAtivo() {
        const isKeyboard = this.elements.orgaoInstrumentButton.classList.contains('d-none');
        return isKeyboard && this.elements.rhythmButtons.some(button => button.classList.contains('selected'));
    }

    resetAnimacaoRitmo() {
        const selected = Array.from(this.elements.rhythmButtons).find(btn => btn.classList.contains('selected'));
        if (selected) selected.classList.remove('flash-accent', 'flash-weak');
    }

    exibirInterfaceDePesquisaPesquisando() {
        this.elements.cifraDisplay.classList.add('d-none');
        this.elements.searchIcon.classList.add('d-none');
        this.elements.spinner.classList.remove('d-none');
        this.elements.editTextarea.classList.add('d-none');
        this.elements.searchResultsList.classList.remove('d-none');
    }

    exibirInterfaceDePesquisa() {
        this.elements.cifraDisplay.classList.add('d-none');
        this.elements.searchIcon.classList.add('d-none');
        this.elements.spinner.classList.remove('d-none');
        this.elements.saveButton.classList.add('d-none');
        this.elements.cancelButton.classList.add('d-none');
        this.elements.tocarButton.classList.add('d-none');
        this.elements.searchButton.disabled = true;
    }

    esconderInterfaceDePesquisa() {
        this.elements.searchResultsList.classList.remove('d-none');
        this.elements.searchButton.disabled = false;
    }

    pararspinnerloading() {
        this.elements.searchIcon.classList.remove('d-none');
        this.elements.spinner.classList.add('d-none');
    }

    limparResultados() {
        this.elements.searchButton.disabled = true;
        this.elements.spinner.classList.remove('d-none');
        this.elements.searchIcon.classList.add('d-none');
        this.elements.searchResultsList.innerHTML = '';
    }

    exibirBotaoTocar() {
        this.elements.searchButton.disabled = false;
        this.elements.spinner.classList.add('d-none');
        this.elements.searchIcon.classList.remove('d-none');
        this.elements.searchResultsList.classList.add('d-none');

        this.elements.tocarButton.classList.remove('d-none');
        this.elements.addButton.classList.remove('d-none');
        this.elements.cifraDisplay.classList.remove('d-none');
    }

    resetInterface(ocultarBateria) {
        this.elements.editTextarea.classList.add('d-none');
        this.elements.itemNameInput.classList.add('d-none');
        this.elements.saveButton.classList.add('d-none');
        this.elements.cancelButton.classList.add('d-none');
        this.elements.selectContainer.classList.remove('d-none');
        this.elements.addButton.classList.remove('d-none');
        this.elements.iframeCifra.classList.remove('d-none');
        this.elements.oracoesFrame.classList.add('d-none');
        this.elements.santamissaFrame.classList.add('d-none');
        this.elements.liturgiaDiariaFrame.classList.add('d-none');
        this.elements.melodyStyleSelect.classList.remove('d-none');
        this.elements.drumStyleSelect.classList.add('d-none');
        this.elements.orgaoInstrumentButton.classList.remove('d-none');
        this.elements.melodyWrapper.classList.remove('d-none');
        this.elements.bateriaInstrumentButton.classList.add('d-none');

        if (ocultarBateria)
            this.elements.rhythmButtonsControl.classList.add('d-none');
    }

    rolarIframeParaTopo(iframe) {
        iframe.contentWindow.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }

    exibirIframeCifra() {
        //this.resetInterface();
        this.elements.iframeCifra.classList.remove('d-none');
        this.elements.liturgiaDiariaFrame.classList.add('d-none');
        this.elements.santamissaFrame.classList.add('d-none');
        this.elements.oracoesFrame.classList.add('d-none');
        //this.elements.melodyStyleSelect.classList.add('d-none');
        //this.elements.orgaoInstrumentButton.classList.add('d-none');
    }

    esconderEditDeleteButtons() {
        if (this.elements.deleteSavesSelect.classList.contains('show')) {
            this.elements.deleteSavesSelect.classList.remove('show');
            this.elements.editSavesSelect.classList.remove('show');
            this.elements.addButton.classList.add('rounded-right-custom');
            this.elements.addButton.classList.remove('rounded-0');

            setTimeout(() => {
                this.elements.deleteSavesSelect.classList.add('d-none');
                this.elements.editSavesSelect.classList.add('d-none');
            }, 100);
        }
    }

    exibirSavesSelect() {
        this.elements.savesSelect.value = this.elements.selectedButton.innerText;
        this.elements.selectContainer.classList.remove('d-none');
        this.elements.selectedButton.classList.add('d-none');
        this.elements.savesSelect.click();
    }

    exibirFrame(frameId) {
        if (this.elements.savesSelect.value) {
            this.elements.selectContainer.classList.add('d-none');
            this.elements.selectedButton.classList.remove('d-none');
            this.elements.selectedButton.innerText = this.elements.savesSelect.value;
        }
        this.elements.oracoesFrame.classList.add('d-none');
        this.elements.santamissaFrame.classList.add('d-none');
        this.elements.iframeCifra.classList.add('d-none');
        this.elements.liturgiaDiariaFrame.classList.add('d-none');

        if (frameId) {
            const frame = this.elements[frameId];
            if (frame) {
                frame.classList.remove('d-none');

                if (frameId === 'santamissaFrame') {
                    const scrollTop = localStorage.getItem('scrollTop');
                    if (scrollTop && !location.origin.includes('file:')) {
                        frame.contentWindow.scrollTo(0, parseInt(scrollTop));
                    }
                }
            }
        }

        $('#optionsModal').modal('hide');
    }

    toggleEditDeleteButtons() {
        if (this.elements.deleteSavesSelect.classList.contains('d-none')) {
            this.elements.deleteSavesSelect.classList.remove('d-none');
            this.elements.editSavesSelect.classList.remove('d-none');

            setTimeout(() => {
                this.elements.deleteSavesSelect.classList.add('show');
                this.elements.editSavesSelect.classList.add('show');
            }, 10); // Pequeno atraso para permitir que o efeito seja aplicado
        } else {
            this.elements.deleteSavesSelect.classList.remove('show');
            this.elements.editSavesSelect.classList.remove('show');

            setTimeout(() => {
                this.elements.deleteSavesSelect.classList.add('d-none');
                this.elements.editSavesSelect.classList.add('d-none');
            }, 100);
        }

        this.elements.addButton.classList.toggle('rounded-0');
        this.elements.addButton.classList.toggle('rounded-right-custom');
    }

    versionAlert(versionConfig) {
        this.customAlert(versionConfig.htmlMessage, 'Nova Versão - ' + versionConfig.version, 'Fechar').then(() => { });
    }

    async customAlert(message, title = "Aviso", buttonText = "OK") {
        return new Promise((resolve) => {
            const modal = new bootstrap.Modal(document.getElementById('customAlertModal'));
            const modalTitle = document.getElementById('customAlertModalLabel');
            const modalBody = document.getElementById('customAlertModalBody');
            const btnOk = document.getElementById('btnAlertDialogOK');

            modalTitle.textContent = title;
            if (/<[a-z][\s\S]*>/i.test(message))
                modalBody.innerHTML = message;
            else
                modalBody.textContent = message;
            btnOk.textContent = buttonText;

            btnOk.onclick = null;

            const handleModalHidden = () => {
                resolve();
                document.getElementById('customAlertModal').removeEventListener('hidden.bs.modal', handleModalHidden);
            };
            document.getElementById('customAlertModal').addEventListener('hidden.bs.modal', handleModalHidden);

            btnOk.onclick = () => {
                modal.hide();
            };

            modal.show();
        });
    }

    async customConfirm(message, title = "Confirmação") {
        return new Promise((resolve) => {
            const modal = new bootstrap.Modal(document.getElementById('customConfirmModal'));
            const modalTitle = document.getElementById('customConfirmModalLabel');
            const modalBody = document.getElementById('customConfirmModalBody');
            const btnConfirmAction = document.getElementById('btnConfirmAction');
            const btnCancelAction = document.getElementById('btnConfirmCancel');

            modalTitle.textContent = title;
            modalBody.textContent = message;

            btnConfirmAction.onclick = null;
            btnCancelAction.onclick = null;

            btnConfirmAction.onclick = () => {
                modal.hide();
                resolve(true);
            };

            btnCancelAction.onclick = () => {
                modal.hide();
                resolve(false); // Retorna false se cancelar
            };

            const handleModalHidden = () => {
                resolve(false);
                document.getElementById('customConfirmModal').removeEventListener('hidden.bs.modal', handleModalHidden);
            };
            document.getElementById('customConfirmModal').addEventListener('hidden.bs.modal', handleModalHidden);

            modal.show();
        });
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        this.aplicarModoEscuroIframe();
    }

    updateSwitchDarkMode() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (isDarkMode) {
            this.elements.darkModeToggle.checked = false;
        } else {
            this.elements.darkModeToggle.checked = true;
        }
    }

    aplicarModoEscuroIframe() {
        const scrollTop = localStorage.getItem('scrollTop');
        if (scrollTop && !location.origin.includes('file:')) {
            this.elements.santamissaFrame.contentWindow.scrollTo(0, parseInt(scrollTop));
        }
    }

    injetarEstilosNoIframeCifra() {
        const doc = this.elements.iframeCifra.contentDocument;
        if (!doc) return;

        if (!doc.getElementById('cifra-style')) {
            const style = doc.createElement('style');

            doc.head.querySelectorAll('style').forEach(style => {
                style.remove();
            });

            style.innerHTML = `
                .cifraSelecionada {
                    background-color: #DAA520;
                    padding: 1px 2px;
                    border-radius:3px;
                }
                pre.cifra {
                    font-size: 12pt;
                    font-family: Consolas, 'Courier New', Courier, monospace;
                    height: 3000px;
                }
                pre.letra {
                    font-size: 15pt;
                    font-family: 'Roboto', sans-serif;
                    white-space: pre-wrap;
                    height: 1000px;
                }
            `;
            doc.head.appendChild(style);
        }
    }

    ativarNotesButton() {
        if (this.elements.notesButton.classList.contains('notaSolo')) {
            this.elements.musicNoteIcon.classList.add('d-none');
            this.elements.musicNoteBeamedIcon.classList.remove('d-none');
            this.elements.notesButton.classList.remove('notaSolo');
        }
        this.elements.notesButton.classList.add('pressed');
    }

    desativarNotesButton() {
        if (this.elements.notesButton.classList.contains('notaSolo')) {
            this.elements.musicNoteIcon.classList.add('d-none');
            this.elements.musicNoteBeamedIcon.classList.remove('d-none');
            this.elements.notesButton.classList.remove('notaSolo');
        }
        this.elements.notesButton.classList.remove('pressed');
    }
}