class ABCParser {
    static parse(abcText) {
        const lines = abcText.split('\n');
        let parsedData = [];
        let currentLineNotes = [];
        let currentChord = "";
        const tokenRegex = /\[[^\]]*\]|"[^"]*"|[\^_=]?[a-gA-GzZ][,']*[0-9]*\/*[0-9]*|-|\|/g;

        const parsePitch = (abcPitch) => {
            if (abcPitch.toLowerCase().startsWith('z')) return null;

            let accidental = '';
            if (abcPitch.startsWith('^')) accidental = '#';
            else if (abcPitch.startsWith('_')) accidental = 'b';

            const cleanPitch = abcPitch.replace(/[\^_=0-9\/]/g, '');
            if (!cleanPitch) return null;

            const baseNote = cleanPitch[0];

            let octave = 4;
            if (baseNote >= 'a' && baseNote <= 'g') octave = 5;

            for (let i = 1; i < cleanPitch.length; i++) {
                if (cleanPitch[i] === ',') octave -= 1;
                else if (cleanPitch[i] === "'") octave += 1;
            }

            const finalPitch = `${baseNote.toLowerCase()}${accidental}/${octave}`;

            const noteValues = { 'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11 };
            let numValue = octave * 12 + noteValues[baseNote.toLowerCase()];
            if (accidental === '#') numValue += 1;
            if (accidental === 'b') numValue -= 1;

            return { vfPitch: finalPitch, value: numValue };
        };

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            if (/^[A-Z]:/.test(trimmedLine) || trimmedLine.startsWith('%')) return;

            if (trimmedLine.startsWith('K:')) {
                const key = trimmedLine.substring(2).trim().split(' ')[0];
                const tomSelect = document.getElementById('tomSelect');
                if (tomSelect) {
                    tomSelect.value = key;
                    tomSelect.dispatchEvent(new Event('change'));
                }
                return;
            }

            if (trimmedLine.startsWith('w:')) {
                let lyricText = trimmedLine.substring(2).trim();

                let syllables = [];
                let tokensText = lyricText.split(/\s+/);

                tokensText.forEach(token => {
                    let melismaCount = (token.match(/_/g) || []).length;
                    let cleanToken = token.replace(/_/g, '');

                    if (cleanToken === '*') {
                        syllables.push("");
                    } else if (cleanToken !== '') {
                        let partes = cleanToken.split('-');
                        for (let i = 0; i < partes.length; i++) {
                            let syl = partes[i];
                            if (i < partes.length - 1) syl += '-';
                            syllables.push(syl);
                        }
                    }

                    for (let j = 0; j < melismaCount; j++) {
                        syllables.push("");
                    }
                });

                let lyricIdx = 0;
                for (let i = 0; i < currentLineNotes.length; i++) {
                    if (lyricIdx >= syllables.length) break;
                    if (!currentLineNotes[i].rest) {
                        if (syllables[lyricIdx]) {
                            currentLineNotes[i].lyric = syllables[lyricIdx];
                        }
                        lyricIdx++;
                    }
                }
                return;
            }

            if (/^[A-Z]:/.test(trimmedLine)) return;

            currentLineNotes = [];
            const tokens = trimmedLine.match(tokenRegex);
            if (!tokens) return;

            tokens.forEach(token => {
                if (token.startsWith('"')) {
                    currentChord = token.replace(/"/g, '');
                }
                else if (token === '|') {
                    if (parsedData.length > 0) parsedData[parsedData.length - 1].bar = true;
                }
                else if (token === '-') {
                    if (parsedData.length > 0) parsedData[parsedData.length - 1].tie = true;
                }
                else if (token.toLowerCase().startsWith('z')) {
                    const noteObj = {
                        notes: ["b/4"], chord: currentChord, lyric: "",
                        bar: false, rest: true, tie: false, lineBreak: false
                    };
                    parsedData.push(noteObj);
                    currentLineNotes.push(noteObj);
                    currentChord = "";
                }
                else if (token.startsWith('[')) {
                    const innerPitches = token.replace(/[\[\]]/g, '').match(/[\^_=]?[a-gA-G][,']*/g);
                    if (innerPitches) {
                        let highestPitch = null;
                        let maxVal = -999;
                        innerPitches.forEach(p => {
                            const pData = parsePitch(p);
                            if (pData && pData.value > maxVal) {
                                maxVal = pData.value;
                                highestPitch = pData.vfPitch;
                            }
                        });
                        if (highestPitch) {
                            const noteObj = {
                                notes: [highestPitch], chord: currentChord, lyric: "",
                                bar: false, rest: false, tie: false, lineBreak: false
                            };
                            parsedData.push(noteObj);
                            currentLineNotes.push(noteObj);
                            currentChord = "";
                        }
                    }
                }
                else {
                    const pData = parsePitch(token);
                    if (pData) {
                        const noteObj = {
                            notes: [pData.vfPitch], chord: currentChord, lyric: "",
                            bar: false, rest: false, tie: false, lineBreak: false
                        };
                        parsedData.push(noteObj);
                        currentLineNotes.push(noteObj);
                        currentChord = "";
                    }
                }
            });

            if (currentLineNotes.length > 0) {
                currentLineNotes[currentLineNotes.length - 1].lineBreak = true;
            }
        });

        if (parsedData.length > 0) {
            parsedData[parsedData.length - 1].lineBreak = false;
        }

        return parsedData; // Retorna o array de notas pronto
    }
}