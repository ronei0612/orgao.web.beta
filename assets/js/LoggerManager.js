class LoggerManager {
    constructor(version, updateDate) {
        this.version = version;
        this.updateDate = updateDate;
        this.maxLogs = 100; // Guarda os últimos 100 logs
        this.storageKey = 'system_logs';

        // Elementos do Modal
        this.logArea = document.getElementById('system-logs-area');
        this.logVersionInfo = document.getElementById('log-version-info');
        this.btnClear = document.getElementById('btn-clear-logs');
        this.aboutVersionInfo = document.getElementById('about-version-info');

        this.initInterceptor();
        this.initGlobalErrors();
        this.initUI();
    }

    initInterceptor() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            this.saveLog('LOG', args);
            originalLog.apply(console, args);
        };

        console.warn = (...args) => {
            this.saveLog('WARN', args);
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            this.saveLog('ERROR', args);
            originalError.apply(console, args);
        };
    }

    initGlobalErrors() {
        // Erros de sintaxe ou execução gerais
        window.onerror = (msg, url, line, col, error) => {
            const errorMsg = `[FALHA FATAL]\nMsg: ${msg}\nLinha: ${line}:${col}\nArquivo: ${url}`;
            console.error(errorMsg);
            alert(`🔥 ERRO NO APLICATIVO 🔥\n\n${errorMsg}\n\nAbra os 'Logs do Sistema' para mais detalhes.`);
            return false;
        };

        // Erros de Promises rejeitadas (ex: Fetch falhando, async/await sem try catch)
        window.addEventListener('unhandledrejection', (event) => {
            const errorMsg = `[PROMISE REJEITADA]\nMotivo: ${event.reason}`;
            console.error(errorMsg);
            alert(`🔥 ERRO ASYNC 🔥\n\n${errorMsg}`);
        });
    }

    saveLog(type, args) {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        const logLine = `[${timestamp}] [${type}] ${msg}`;

        let logs = JSON.parse(localStorage.getItem(this.storageKey)) || [];
        logs.push(logLine);

        // Se passar do limite, remove os mais antigos
        if (logs.length > this.maxLogs) {
            logs = logs.slice(logs.length - this.maxLogs);
        }

        localStorage.setItem(this.storageKey, JSON.stringify(logs));

        // Atualiza a tela em tempo real se o modal estiver aberto
        if (this.logArea) {
            this.logArea.value = logs.join('\n');
            this.logArea.scrollTop = this.logArea.scrollHeight;
        }
    }

    initUI() {
        // Atualiza os textos de versão nas telas
        if (this.logVersionInfo) this.logVersionInfo.innerText = `Versão: ${this.version} (${this.updateDate})`;
        if (this.aboutVersionInfo) this.aboutVersionInfo.innerText = `Versão ${this.version} • ${this.updateDate}`;

        // Atualiza o textarea quando o modal abrir
        const modalEl = document.getElementById('logsModal');
        if (modalEl) {
            modalEl.addEventListener('show.bs.modal', () => {
                const logs = JSON.parse(localStorage.getItem(this.storageKey)) || [];
                this.logArea.value = logs.length > 0 ? logs.join('\n') : 'Nenhum log registrado ainda...';

                // Rola para o fim
                setTimeout(() => { this.logArea.scrollTop = this.logArea.scrollHeight; }, 100);
            });
        }

        // Botão de Limpar
        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => {
                localStorage.removeItem(this.storageKey);
                this.logArea.value = 'Logs limpos com sucesso!';
            });
        }
    }
}