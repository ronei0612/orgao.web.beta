class TextFormatter {
    static processEditorData(rootElement) {
        const clone = rootElement.cloneNode(true);
        TextFormatter.autoFormatChords(clone);
        TextFormatter.cleanSheetMusicBlocks(clone);
        return clone.innerHTML;
    }

    static prepareContent(content) {
        if (!content) return "";

        // Se for texto puro com quebras de linha (\n), converte para <br>
        let htmlContent = content.includes('\n') ? content.replace(/\n/g, '<br>') : content;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        TextFormatter.autoFormatChords(tempDiv);
        TextFormatter.cleanSheetMusicBlocks(tempDiv);

        return tempDiv.innerHTML;
    }

    static autoFormatChords(root) {
        // 1. Remove negritos antigos para evitar dupla formatação
        const existingBold = root.querySelectorAll('b, strong');
        existingBold.forEach(b => {
            const fragment = document.createDocumentFragment();
            while (b.firstChild) fragment.appendChild(b.firstChild);
            b.parentNode.replaceChild(fragment, b);
        });

        // 2. Regex e Exceções
        const chordRegex = /^[CDEFGAB][#b]?(m|M|maj|dim|aug|sus)?\d*(?:\(?[#b]?\d+\)?)?(?:\/[CDEFGAB][#b]?)?$/;
        const exceptions = ['intro', 'solo', 'refrão', 'refrao', 'ponte', 'bis', 'pausa', 'fim', 'coda'];

        const isChordLine = (text) => {
            if (!text || text.trim() === '') return false;
            const tokens = text.trim().split(/\s+/);

            let hasChord = false;
            for (let token of tokens) {
                const cleanToken = token.toLowerCase().replace(/[()[\]:,|]/g, '');
                if (cleanToken === '') continue;

                if (chordRegex.test(token)) {
                    hasChord = true;
                } else if (!exceptions.includes(cleanToken) && !/^\d+x$/.test(cleanToken)) {
                    return false;
                }
            }
            return hasChord;
        };

        // 3. Varredura dos nós de texto
        let currentLineNodes = [];
        let currentLineText = "";

        const processLine = () => {
            if (isChordLine(currentLineText)) {
                currentLineNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const parts = node.nodeValue.split(/(\s+)/);
                        const fragment = document.createDocumentFragment();

                        parts.forEach(part => {
                            if (part.trim() !== '' && chordRegex.test(part)) {
                                const b = document.createElement('b');
                                b.textContent = part;
                                fragment.appendChild(b);
                            } else {
                                fragment.appendChild(document.createTextNode(part));
                            }
                        });
                        node.parentNode.replaceChild(fragment, node);
                    }
                });
            }
            currentLineNodes = [];
            currentLineText = "";
        };

        const walk = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (['B', 'STRONG'].includes(node.tagName)) return;

                const isBlock = ['DIV', 'P', 'BR', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName);

                if (isBlock) processLine();

                if (node.classList && node.classList.contains('sheet-music-block')) {
                    currentLineText += " [PARTITURA] ";
                    return;
                }

                Array.from(node.childNodes).forEach(walk);
                if (isBlock) processLine();

            } else if (node.nodeType === Node.TEXT_NODE) {
                currentLineNodes.push(node);
                currentLineText += node.nodeValue;
            }
        };

        walk(root);
        processLine();
    }

    static cleanSheetMusicBlocks(root) {
        const blocks = root.querySelectorAll('.sheet-music-block');
        blocks.forEach(block => {
            block.innerHTML = '';
        });
    }
}
