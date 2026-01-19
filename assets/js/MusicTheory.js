class MusicTheory {
    constructor() {
        this.notasAcordesJson = {
            "A#": ["a#", "d", "f"],
            "A#4": ["a#", "d#", "f"],
            "A#5+": ["a#", "d", "f#"],
            "A#6": ["a#", "d", "f", "g"],
            "A#7": ["a#", "d", "f", "g#"],
            "A#7M": ["a#", "d", "f", "a"],
            "A#9": ["a#", "d", "f", "c"],
            "A#m": ["a#", "c#", "f"],
            "A#m5+": ["a#", "c#", "f#"],
            "A#m6": ["a#", "c#", "f", "g"],
            "A#m7": ["a#", "c#", "f", "g#"],
            "A#m9": ["a#", "c#", "f", "c"],
            "A#m7M": ["a#", "c#", "f", "a"],
            "A#°": ["a#", "c#", "e"],
            "A#°7": ["a#", "c#", "e", "g#"],
            "A": ["a", "c#", "e"],
            "A4": ["a", "d", "e"],
            "A5+": ["a", "c#", "f"],
            "A6": ["a", "c#", "e", "f#"],
            "A7": ["a", "c#", "e", "g"],
            "A7M": ["a", "c#", "e", "g#"],
            "A9": ["a", "c#", "e", "b"],
            "Am": ["a", "c", "e"],
            "Am5+": ["a", "c", "f"],
            "Am6": ["a", "c", "e", "f#"],
            "Am7": ["a", "c", "e", "g"],
            "Am9": ["a", "c", "e", "b"],
            "Am7M": ["a", "c", "e", "g#"],
            "A°": ["a", "c", "d#"],
            "A°7": ["a", "c", "d#", "g"],
            "Ab": ["g#", "c", "d#"],
            "Ab4": ["g#", "c#", "d#"],
            "Ab5+": ["g#", "c", "e"],
            "Ab6": ["g#", "c", "d#", "f"],
            "Ab7": ["g#", "c", "d#", "f#"],
            "Ab7M": ["g#", "c", "d#", "g"],
            "Ab9": ["g#", "c", "d#", "a#"],
            "Abm": ["g#", "b", "d#"],
            "Abm5+": ["g#", "b", "e"],
            "Abm6": ["g#", "b", "d#", "f"],
            "Abm7": ["g#", "b", "d#", "f#"],
            "Abm9": ["g#", "b", "d#", "a#"],
            "Abm7M": ["g#", "b", "d#", "g"],
            "Ab°": ["g#", "b", "d"],
            "Ab°7": ["g#", "b", "d", "f#"],
            "B": ["b", "d#", "f#"],
            "B4": ["b", "e", "f#"],
            "B5+": ["b", "d#", "g"],
            "B6": ["b", "d#", "f#", "g#"],
            "B7": ["b", "d#", "f#", "a"],
            "B7M": ["b", "d#", "f#", "a#"],
            "B9": ["b", "d#", "f#", "c#"],
            "Bm": ["b", "d", "f#"],
            "Bm5+": ["b", "d", "g"],
            "Bm6": ["b", "d", "f#", "g#"],
            "Bm7": ["b", "d", "f#", "a"],
            "Bm9": ["b", "d", "f#", "c#"],
            "Bm7M": ["b", "d", "f#", "a#"],
            "B°": ["b", "d", "f"],
            "B°7": ["b", "d", "f", "a"],
            "Bb": ["a#", "d", "f"],
            "Bb4": ["a#", "d#", "f"],
            "Bb5+": ["a#", "d", "f#"],
            "Bb6": ["a#", "d", "f", "g"],
            "Bb7": ["a#", "d", "f", "g#"],
            "Bb7M": ["a#", "d", "f", "a"],
            "Bb9": ["a#", "d", "f", "c"],
            "Bbm": ["a#", "c#", "f"],
            "Bbm5+": ["a#", "c#", "f#"],
            "Bbm6": ["a#", "c#", "f", "g"],
            "Bbm7": ["a#", "c#", "f", "g#"],
            "Bbm9": ["a#", "c#", "f", "c"],
            "Bbm7M": ["a#", "c#", "f", "a"],
            "Bb°": ["a#", "c#", "e"],
            "Bb°7": ["a#", "c#", "e", "g#"],
            "Cb": ["b", "d#", "f#"],
            "Cb4": ["b", "e", "f#"],
            "Cb5+": ["b", "d#", "g"],
            "Cb6": ["b", "d#", "f#", "g#"],
            "Cb7": ["b", "d#", "f#", "a"],
            "Cb7M": ["b", "d#", "f#", "a#"],
            "Cb9": ["b", "d#", "f#", "c#"],
            "Cbm": ["b", "d", "f#"],
            "Cbm5+": ["b", "d", "g"],
            "Cbm6": ["b", "d", "f#", "g#"],
            "Cbm7": ["b", "d", "f#", "a"],
            "Cbm9": ["b", "d", "f#", "c#"],
            "Cbm7M": ["b", "d", "f#", "a#"],
            "Cb°": ["b", "d", "f"],
            "Cb°7": ["b", "d", "f", "a"],
            "C#": ["c#", "f", "g#"],
            "C#4": ["c#", "f#", "g#"],
            "C#5+": ["c#", "f", "a"],
            "C#6": ["c#", "f", "g#", "a#"],
            "C#7": ["c#", "f", "g#", "b"],
            "C#7M": ["c#", "f", "g#", "c"],
            "C#9": ["c#", "f", "g#", "d#"],
            "C#m": ["c#", "e", "g#"],
            "C#m5+": ["c#", "e", "a"],
            "C#m6": ["c#", "e", "g#", "a#"],
            "C#m7": ["c#", "e", "g#", "b"],
            "C#m9": ["c#", "e", "g#", "d#"],
            "C#m7M": ["c#", "e", "g#", "c"],
            "C#°": ["c#", "e", "g"],
            "C#°7": ["c#", "e", "g", "b"],
            "C": ["c", "e", "g"],
            "C4": ["c", "f", "g"],
            "C5+": ["c", "e", "g#"],
            "C6": ["c", "e", "g", "a"],
            "C7": ["c", "e", "g", "a#"],
            "C7M": ["c", "e", "g", "b"],
            "C9": ["c", "e", "g", "d"],
            "Cm": ["c", "d#", "g"],
            "Cm5+": ["c", "d#", "g#"],
            "Cm6": ["c", "d#", "g", "a"],
            "Cm7": ["c", "d#", "g", "a#"],
            "Cm9": ["c", "d#", "g", "d"],
            "Cm7M": ["c", "d#", "g", "b"],
            "C°": ["c", "d#", "f#"],
            "C°7": ["c", "d#", "f#", "a#"],
            "B#": ["c", "e", "g"],
            "B#4": ["c", "f", "g"],
            "B#5+": ["c", "e", "g#"],
            "B#6": ["c", "e", "g", "a"],
            "B#7": ["c", "e", "g", "a#"],
            "B#7M": ["c", "e", "g", "b"],
            "B#9": ["c", "e", "g", "d"],
            "B#m": ["c", "d#", "g"],
            "B#m5+": ["c", "d#", "g#"],
            "B#m6": ["c", "d#", "g", "a"],
            "B#m7": ["c", "d#", "g", "a#"],
            "B#m9": ["c", "d#", "g", "d"],
            "B#m7M": ["c", "d#", "g", "b"],
            "B#°": ["c", "d#", "f#"],
            "B#°7": ["c", "d#", "f#", "a#"],
            "D": ["d", "f#", "a"],
            "D#": ["d#", "g", "a#"],
            "D#4": ["d#", "g#", "a#"],
            "D#5+": ["d#", "g", "b"],
            "D#6": ["d#", "g", "a#", "c"],
            "D#7": ["d#", "g", "a#", "c#"],
            "D#7M": ["d#", "g", "a#", "d"],
            "D#9": ["d#", "g", "a#", "f"],
            "D#m": ["d#", "f#", "a#"],
            "D#m5+": ["d#", "f#", "b"],
            "D#m6": ["d#", "f#", "a#", "c"],
            "D#m7": ["d#", "f#", "a#", "c#"],
            "D#m9": ["d#", "f#", "a#", "f"],
            "D#m7M": ["d#", "f#", "a#", "d"],
            "D#°": ["d#", "f#", "a"],
            "D#°7": ["d#", "f#", "a", "c#"],
            "D4": ["d", "g", "a"],
            "D5+": ["d", "f#", "a#"],
            "D6": ["d", "f#", "a", "b"],
            "D7": ["d", "f#", "a", "c"],
            "D7M": ["d", "f#", "a", "c#"],
            "D9": ["d", "f#", "a", "e"],
            "Db": ["c#", "f", "g#"],
            "Db4": ["c#", "f#", "g#"],
            "Db5+": ["c#", "f", "a"],
            "Db6": ["c#", "f", "g#", "a#"],
            "Db7": ["c#", "f", "g#", "b"],
            "Db7M": ["c#", "f", "g#", "c"],
            "Db9": ["c#", "f", "g#", "d#"],
            "Dbm": ["c#", "e", "g#"],
            "Dbm5+": ["c#", "e", "a"],
            "Dbm6": ["c#", "e", "g#", "a#"],
            "Dbm7": ["c#", "e", "g#", "b"],
            "Dbm9": ["c#", "e", "g#", "d#"],
            "Dbm7M": ["c#", "e", "g#", "c"],
            "Db°": ["c#", "e", "g"],
            "Db°7": ["c#", "e", "g", "b"],
            "Dm": ["d", "f", "a"],
            "Dm5+": ["d", "f", "a#"],
            "Dm6": ["d", "f", "a", "b"],
            "Dm7": ["d", "f", "a", "c"],
            "Dm7M": ["d", "f", "a", "c#"],
            "D°": ["d", "f", "g#"],
            "D°7": ["d", "f", "g#", "c"],
            "Eb": ["d#", "g", "a#"],
            "Eb4": ["d#", "g#", "a#"],
            "Eb5+": ["d#", "g", "b"],
            "Eb6": ["d#", "g", "a#", "c"],
            "Eb7": ["d#", "g", "a#", "c#"],
            "Eb7M": ["d#", "g", "a#", "d"],
            "Eb9": ["d#", "g", "a#", "f"],
            "Ebm": ["d#", "f#", "a#"],
            "Ebm5+": ["d#", "f#", "b"],
            "Ebm6": ["d#", "f#", "a#", "c"],
            "Ebm7": ["d#", "f#", "a#", "c#"],
            "Ebm9": ["d#", "f#", "a#", "f"],
            "Ebm7M": ["d#", "f#", "a#", "d"],
            "Eb°": ["d#", "f#", "a"],
            "Eb°7": ["d#", "f#", "a", "c#"],
            "E": ["e", "g#", "b"],
            "E4": ["e", "a", "b"],
            "E5+": ["e", "g#", "c"],
            "E6": ["e", "g#", "b", "c#"],
            "E7": ["e", "g#", "b", "d"],
            "E7M": ["e", "g#", "b", "d#"],
            "E9": ["e", "g#", "b", "f#"],
            "Em": ["e", "g", "b"],
            "Em5+": ["e", "g", "c"],
            "Em6": ["e", "g", "b", "c#"],
            "Em7": ["e", "g", "b", "d"],
            "Em9": ["e", "g", "b", "f#"],
            "Em7M": ["e", "g", "b", "d#"],
            "E°": ["e", "g", "a#"],
            "E°7": ["e", "g", "a#", "d"],
            "Fb": ["e", "g#", "b"],
            "Fb4": ["e", "a", "b"],
            "Fb5+": ["e", "g#", "c"],
            "Fb6": ["e", "g#", "b", "c#"],
            "Fb7": ["e", "g#", "b", "d"],
            "Fb7M": ["e", "g#", "b", "d#"],
            "Fb9": ["e", "g#", "b", "f#"],
            "Fbm": ["e", "g", "b"],
            "Fbm5+": ["e", "g", "c"],
            "Fbm6": ["e", "g", "b", "c#"],
            "Fbm7": ["e", "g", "b", "d"],
            "Fbm9": ["e", "g", "b", "f#"],
            "Fbm7M": ["e", "g", "b", "d#"],
            "Fb°": ["e", "g", "a#"],
            "Fb°7": ["e", "g", "a#", "d"],
            "F#": ["f#", "a#", "c#"],
            "F#4": ["f#", "b", "c#"],
            "F#5+": ["f#", "a#", "d"],
            "F#6": ["f#", "a#", "c#", "d#"],
            "F#7": ["f#", "a#", "c#", "e"],
            "F#7M": ["f#", "a#", "c#", "f"],
            "F#9": ["f#", "a#", "c#", "g#"],
            "F#m": ["f#", "a", "c#"],
            "F#m5+": ["f#", "a", "d"],
            "F#m6": ["f#", "a", "c#", "d#"],
            "F#m7": ["f#", "a", "c#", "e"],
            "F#m9": ["f#", "a", "c#", "g#"],
            "F#m7M": ["f#", "a", "c#", "f"],
            "F#°": ["f#", "a", "c"],
            "F#°7": ["f#", "a", "c", "e"],
            "E#": ["f", "a", "c"],
            "E#4": ["f", "a#", "c"],
            "E#5+": ["f", "a", "c#"],
            "E#6": ["f", "a", "c", "d"],
            "E#7": ["f", "a", "c", "d#"],
            "E#7M": ["f", "a", "c", "e"],
            "E#9": ["f", "a", "c", "g"],
            "E#m": ["f", "g#", "c"],
            "E#m5+": ["f", "g#", "c#"],
            "E#m6": ["f", "g#", "c", "d"],
            "E#m7": ["f", "g#", "c", "d#"],
            "E#m9": ["f", "g#", "c", "g"],
            "E#m7M": ["f", "g#", "c", "e"],
            "E#°": ["f", "g#", "b"],
            "E#°7": ["f", "g#", "b", "d#"],
            "F": ["f", "a", "c"],
            "F4": ["f", "a#", "c"],
            "F5+": ["f", "a", "c#"],
            "F6": ["f", "a", "c", "d"],
            "F7": ["f", "a", "c", "d#"],
            "F7M": ["f", "a", "c", "e"],
            "F9": ["f", "a", "c", "g"],
            "Fm": ["f", "g#", "c"],
            "Fm5+": ["f", "g#", "c#"],
            "Fm6": ["f", "g#", "c", "d"],
            "Fm7": ["f", "g#", "c", "d#"],
            "Fm9": ["f", "g#", "c", "g"],
            "Fm7M": ["f", "g#", "c", "e"],
            "F°": ["f", "g#", "b"],
            "F°7": ["f", "g#", "b", "d#"],
            "G": ["g", "b", "d"],
            "G#": ["g#", "c", "d#"],
            "G#4": ["g#", "c#", "d#"],
            "G#5+": ["g#", "c", "e"],
            "G#6": ["g#", "c", "d#", "f"],
            "G#7": ["g#", "c", "d#", "f#"],
            "G#7M": ["g#", "c", "d#", "g"],
            "G#9": ["g#", "c", "d#", "a#"],
            "G#m": ["g#", "b", "d#"],
            "G#m5+": ["g#", "b", "e"],
            "G#m6": ["g#", "b", "d#", "f"],
            "G#m7": ["g#", "b", "d#", "f#"],
            "G#m9": ["g#", "b", "d#", "a#"],
            "G#m7M": ["g#", "b", "d#", "g"],
            "G#°": ["g#", "b", "d"],
            "G#°7": ["g#", "b", "d", "f#"],
            "G4": ["g", "c", "d"],
            "G5+": ["g", "b", "d#"],
            "G6": ["g", "b", "d", "e"],
            "G7": ["g", "b", "d", "f"],
            "G7M": ["g", "b", "d", "f#"],
            "G9": ["g", "b", "d", "a"],
            "Gb": ["f#", "a#", "c#"],
            "Gb4": ["f#", "b", "c#"],
            "Gb5+": ["f#", "a#", "d"],
            "Gb6": ["f#", "a#", "c#", "d#"],
            "Gb7": ["f#", "a#", "c#", "e"],
            "Gb7M": ["f#", "a#", "c#", "f"],
            "Gb9": ["f#", "a#", "c#", "g#"],
            "Gbm": ["f#", "a", "c#"],
            "Gbm5+": ["f#", "a", "d"],
            "Gbm6": ["f#", "a", "c#", "d#"],
            "Gbm7": ["f#", "a", "c#", "e"],
            "Gbm9": ["f#", "a", "c#", "g#"],
            "Gbm7M": ["f#", "a", "c#", "f"],
            "Gb°": ["f#", "a", "c"],
            "Gb°7": ["f#", "a", "c", "e"],
            "Gm": ["g", "a#", "d"],
            "Gm5+": ["g", "a#", "d#"],
            "Gm6": ["g", "a#", "d", "e"],
            "Gm7": ["g", "a#", "d", "f"],
            "Gm9": ["g", "a#", "d", "a"],
            "Gm7M": ["g", "a#", "d", "f#"],
            "G°": ["g", "a#", "c#"],
            "G°7": ["g", "a#", "c#", "f"]
        };
        this.notasAcordes = Object.keys(this.notasAcordesJson);

        this.acordeMap = {
            'c#': 'c_', 'd#': 'd_', 'e#': 'e_', 'f#': 'f_', 'g#': 'g_', 'a#': 'a_', 'b#': 'b_', 'cb': 'b', 'db': 'c_', 'eb': 'd_', 'fb': 'e', 'gb': 'f_', 'ab': 'g_', 'bb': 'a_'
        };

        this.tonsMaiores = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.tonsMenores = this.tonsMaiores.map(tom => tom + 'm');
        this.acordesSustenidos = this.tonsMaiores;
        this.acordesBemol = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        this.acordesSustenidosBemol = this.acordesSustenidos.concat(this.acordesBemol);
        this.acordesMap = {
            'B#': 'C', 'E#': 'F', 'Cb': 'B', 'Fb': 'E', 'Bb': 'A#', 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#'
        };
        this.acordesTomMap = {
            'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb', 'Db': 'C#', 'Gb': 'F#'
        };
        this.acordesSustenidoMap = {
            'Bb': 'A#', 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#'
        };
        this.acordesBemolMap = {
            'A#': 'Bb', 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab'
        };
        this.tonsAcordes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        this.tonsPreferemSustenido = new Set(['C#', 'D', 'E', 'F#', 'G', 'A', 'B']);
        this.tonsPreferemBemol = new Set(['C', 'D#', 'Eb', 'F', 'G#', 'Ab', 'A#', 'Bb']);

        this.camposHarmonicos = {
            // Campos harmônicos maiores
            'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am'],
            'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm'],
            'C#': ['C#', 'D#m', 'Fm', 'F#', 'G#', 'A#m'],
            'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm'],
            'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm'],
            'D#': ['D#', 'Fm', 'Gm', 'G#', 'A#', 'Cm'],
            'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m'],
            'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm'],
            'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m'],
            'Gb': ['Gb', 'Abm', 'Bbm', 'B', 'Db', 'Ebm'],
            'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em'],
            'G#': ['G#', 'A#m', 'B#m', 'C#', 'D#', 'Fm'],
            'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm'],
            'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m'],
            'A#': ['A#', 'B#m', 'Dm', 'D#', 'F', 'Gm'],
            'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm'],
            'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m'],
            // Campos harmônicos menores
            'Am': ['Am', 'C', 'Dm', 'Em', 'F', 'G'],
            'Bbm': ['Bbm', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab'],
            'B#m': ['B#m', 'D', 'E#m', 'F#m', 'G', 'A'],
            'Bm': ['Bm', 'D', 'Em', 'F#m', 'G', 'A'],
            'Cm': ['Cm', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'],
            'C#m': ['C#m', 'E', 'F#m', 'G#m', 'A', 'B'],
            'Dm': ['Dm', 'F', 'Gm', 'Am', 'Bb', 'C'],
            'D#m': ['D#m', 'Gb', 'Abm', 'Bbm', 'Cb', 'Db'],
            'Ebm': ['Ebm', 'Gb', 'Abm', 'Bbm', 'Cb', 'Db'],
            'Em': ['Em', 'G', 'Am', 'Bm', 'C', 'D'],
            'Fm': ['Fm', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'],
            'F#m': ['F#m', 'A', 'Bm', 'C#m', 'D', 'E'],
            'Gm': ['Gm', 'Bb', 'Cm', 'Dm', 'Eb', 'F'],
            'G#m': ['G#m', 'B', 'C#m', 'D#m', 'E', 'F#'],
            'Abm': ['Abm', 'Cb', 'Dbm', 'Ebm', 'Fb', 'Gb'],
            'A#m': ['A#m', 'D', 'E#m', 'F#m', 'G', 'A']
        };

        this.campoHarmonicoAcordes = {
            'C': ['Bb', 'A', 'B°', 'E', 'D', 'C', 'Am', 'F', 'Dm', 'G', 'Em'],
            'C#': ['B', 'Bb', 'C°', 'F', 'Eb', 'C#', 'Bbm', 'F#', 'Ebm', 'Ab', 'Fm'],
            'D': ['C', 'B', 'C#°', 'F#', 'E', 'D', 'Bm', 'G', 'Em', 'A', 'F#m'],
            'Eb': ['C#', 'C', 'D°', 'G', 'F', 'Eb', 'Cm', 'Ab', 'Fm', 'Bb', 'Gm'],
            'E': ['D', 'C#', 'Eb°', 'Ab', 'F#', 'E', 'C#m', 'A', 'F#m', 'B', 'Abm'],
            'F': ['Eb', 'D', 'E°', 'A', 'G', 'F', 'Dm', 'Bb', 'Gm', 'C', 'Am'],
            'F#': ['E', 'Eb', 'F°', 'Bb', 'Ab', 'F#', 'Ebm', 'B', 'Abm', 'C#', 'Bbm'],
            'G': ['F', 'E', 'F#°', 'B', 'A', 'G', 'Em', 'C', 'Am', 'D', 'Bm'],
            'Ab': ['F#', 'F', 'G°', 'C', 'Bb', 'Ab', 'Fm', 'C#', 'Bbm', 'Eb', 'Cm'],
            'A': ['G', 'F#', 'Ab°', 'C#', 'B', 'A', 'F#m', 'D', 'Bm', 'E', 'C#m'],
            'Bb': ['Ab', 'G', 'A°', 'D', 'C', 'Bb', 'Gm', 'Eb', 'Cm', 'F', 'Dm'],
            'B': ['A', 'Ab', 'Bb°', 'Eb', 'C#', 'B', 'Abm', 'E', 'C#m', 'F#', 'Ebm']
        };

        this.notas = ['c', 'c_', 'd', 'd_', 'e', 'f', 'f_', 'g', 'g_', 'a', 'a_', 'b'];

        this.bpm = 90;
    }

    simplificarAcorde(acorde) {
        if (!acorde || typeof acorde !== 'string') return '';

        let limpo = acorde.trim();
        limpo = limpo.split('/')[0];

        const regex = /^([A-G][#b]?)(.*)$/;
        const match = limpo.match(regex);

        if (!match) return acorde;

        const tonica = match[1];
        const resto = match[2];
        const ehMenor = /^(m)/.test(resto);
        const ehDiminuto = /^(°)/.test(resto);
        const tonicaNormalizada = this.acordeMap[tonica.toLowerCase()] || tonica.toLowerCase();
        const notaFinal = tonicaNormalizada + (ehMenor ? 'm' : '') + (ehDiminuto ? 'dim' : '');

        return notaFinal;
    }

    getAcordeNotas(acordeNome) {
        return this.notasAcordesJson[acordeNome];
    }

    getAcorde(acorde, tom) {
        if (tom === null)
            return this.acordesMap[acorde] || acorde;
        if (this.tonsPreferemSustenido.has(tom) || tom.endsWith('#'))
            return this.acordesSustenidoMap[acorde] || acorde;
        else if (this.tonsPreferemBemol.has(tom) || tom.endsWith('b'))
            return this.acordesBemolMap[acorde] || acorde;
        else
            return this.acordesMap[acorde] || acorde;
    }

    transposeAcorde(acorde, steps, targetTom) {
        let tons = this.acordesSustenidos.includes(acorde) ? this.acordesSustenidos : this.acordesBemol;
        let index = tons.indexOf(acorde);
        let novoIndex = (index + steps + tons.length) % tons.length;

        // Use a lógica de preferência do tom alvo para a formatação final.
        let novoTom = this.getAcorde(tons[novoIndex], targetTom);

        return novoTom;
    }

    descobrirTom(cifras) {
        if (!cifras || cifras.length === 0) {
            return '';
        }

        const acordesOrdenados = cifras.slice().sort();
        const padroesAcordes = { doisMenores: false, doisMaiores: false };

        for (let i = 0; i < acordesOrdenados.length - 1; i++) {
            if (acordesOrdenados[i].endsWith('m') && acordesOrdenados[i + 1].endsWith('m')) {
                padroesAcordes.doisMenores = true;
            }
            if (!acordesOrdenados[i].endsWith('m') && !acordesOrdenados[i + 1].endsWith('m')) {
                padroesAcordes.doisMaiores = true;
            }
        }

        const possiveisTons = {};
        for (const [tom, acordes] of Object.entries(this.camposHarmonicos)) {
            let pontos = 0;

            if (padroesAcordes.doisMenores) {
                for (let i = 0; i < acordes.length - 1; i++) {
                    if (acordes[i].endsWith('m') && acordes[i + 1].endsWith('m')) { pontos += 1; }
                }
            }
            if (padroesAcordes.doisMaiores) {
                for (let i = 0; i < acordes.length - 1; i++) {
                    if (!acordes[i].endsWith('m') && !acordes[i + 1].endsWith('m')) { pontos += 1; }
                }
            }

            pontos += cifras.filter(cifra => acordes.includes(cifra)).length;
            cifras.forEach(cifra => {
                if (!acordes.includes(cifra)) {
                    pontos -= 1;
                }
            });

            possiveisTons[tom] = pontos;
        }

        const primeiroAcorde = cifras[0];
        const ultimoAcorde = cifras[cifras.length - 1];

        for (const tom in possiveisTons) {
            if (this.camposHarmonicos[tom][0] === primeiroAcorde) { possiveisTons[tom] += 1; }
            if (this.camposHarmonicos[tom][0] === ultimoAcorde) { possiveisTons[tom] += 1; }
        }

        const tomProvavel = Object.keys(possiveisTons).reduce((a, b) => possiveisTons[a] > possiveisTons[b] ? a : b);
        return tomProvavel;
    }

    inversaoDeAcorde(acorde, baixo) {
        const index = acorde.indexOf(baixo);
        if (index === -1) return acorde;

        return acorde.slice(index).concat(acorde.slice(0, index));
    }
}