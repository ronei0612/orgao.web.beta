// --- INICIO DO SISTEMA DE LOGS ---
const LOG_STORAGE_KEY = 'debug_logs_v1';
const MAX_LOGS = 50; // Guarda apenas as últimas 50 linhas para não lotar a memória

function safeStringify(obj) {
    try {
        if (typeof obj === 'object' && obj !== null) {
            // Tenta converter objetos simples em string
            return JSON.stringify(obj);
        }
        return String(obj);
    } catch (e) {
        return '[Objeto Circular ou Complexo]';
    }
}

function saveLogToStorage(level, args) {
    try {
        // Converte os argumentos (ex: console.log("Erro:", erro)) em uma string única
        const message = args.map(arg => safeStringify(arg)).join(' ');
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `<span style="color:${level === 'ERRO' ? 'red' : '#007bff'}">[${timestamp}] ${level}:</span> ${message}`;

        // Pega os logs atuais
        let logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');

        // Adiciona o novo log
        logs.push(logLine);

        // Remove os antigos se passar do limite
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(logs.length - MAX_LOGS);
        }

        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
        // Se o localStorage estiver cheio ou der erro, ignora para não travar o app
    }
}

// Sobrescreve console.log
const originalLog = console.log;
console.log = function (...args) {
    originalLog.apply(console, args); // Mantém o log normal no navegador
    saveLogToStorage('INFO', args);
};

// Sobrescreve console.error
const originalError = console.error;
console.error = function (...args) {
    originalError.apply(console, args);
    saveLogToStorage('ERRO', args);
};

// Sobrescreve console.warn
const originalWarn = console.warn;
console.warn = function (...args) {
    originalWarn.apply(console, args);
    saveLogToStorage('WARN', args);
};
// --- FIM DO SISTEMA DE LOGS ---