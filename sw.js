const APP_VERSION = 'v1.0.0'; // Mude isso para v1.0.1, v1.0.2... para forçar a atualização
const CACHE_NAME = `orgao-cache-${APP_VERSION}`;

// Lista de arquivos vitais para o site abrir sem internet
const ASSETS_TO_CACHE = [
    './teste.html',
    './style.css',
    './assets/js-v2/TextFormatter.js',
    './assets/js-v2/DatabaseManager.js',
    './assets/js-v2/PreferencesManager.js',
    './assets/js-v2/MusicEngine.js',
    './assets/js-v2/SheetMusicEngine.js',
    './assets/js-v2/BackupManager.js',
    './assets/js-v2/ModalManager.js',
    './assets/js-v2/ToolbarController.js',
    './assets/js-v2/app.js'
];

// INSTALAÇÃO: Baixa os arquivos novos
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Força o novo SW a assumir imediatamente (sem confirmação)
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// ATIVAÇÃO: Apaga caches velhos e avisa a tela que atualizou
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // Apaga versão velha
                    }
                })
            );
        }).then(() => self.clients.claim()) // Pega o controle das telas abertas
    );

    // Manda uma mensagem pro 'app.js' informando que atualizou
    self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
            client.postMessage({ type: 'UPDATE_INSTALLED', version: APP_VERSION });
        });
    });
});

// FETCH: Pega do cache primeiro. Se não tiver no cache, busca na internet.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});