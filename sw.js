const version = '5.8.9';
const CACHE_NAME = 'cifra-app-cache-' + version;

const urlsToCache = [
    './',
    './index.html',
    './cifras.json',
    './styles.json',
    './styles-melody.json',
    './assets/css/styles.css',
    './assets/css/frames-styles.css',
    './assets/css/bateria.css',
    './assets/lib/css/Bootstrap/bootstrap-icons/1.8.1/bootstrap-icons.css',
    './assets/lib/css/Bootstrap/bootstrap-icons/1.8.1/fonts/bootstrap-icons.woff2',
    './assets/lib/css/Bootstrap/4.6.2/bootstrap.min.css',
    './assets/js/App.js',
    './assets/js/CifraPlayer.js',
    './assets/js/AudioContextManager.js',
    './assets/js/LocalStorageManager.js',
    './assets/js/MusicTheory.js',
    './assets/js/UIController.js',
    './assets/js/DraggableController.js',
    './assets/js/DrumMachine.js',
    './assets/js/BateriaUI.js',
    './assets/js/MelodyMachine.js',
    './assets/js/MelodyUI.js',
    './assets/js/CifrasEditor.js',
    './assets/lib/js/Jquery/3.5.1/jquery.min.js',
    './assets/lib/js/Bootstrap/4.6.2/bootstrap.min.js',

    './santamissa.html',
    './oracoes.html',

    // Dependências externas (CDNs) - CRÍTICO para o modo offline!
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

// Evento de Instalação: Salva todos os arquivos listados no cache.
self.addEventListener('install', event => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            console.log('[SW] Iniciando cache de arquivos...');

            // Adiciona um por um para sabermos qual falha
            for (const url of urlsToCache) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Status ${response.status}`);
                    }
                    await cache.put(url, response);
                } catch (error) {
                    console.error(`[SW FALHA] Não foi possível cachear: ${url} - Erro: ${error.message}`);
                    // Opcional: Se quiser que o app funcione mesmo faltando arquivos, 
                    // remova o 'return Promise.reject' abaixo. 
                    // Mas o ideal é manter para saber que algo está errado.
                    return Promise.reject(error);
                }
            }
            console.log('[SW] Todos os arquivos foram cacheados com sucesso!');
        })
    );
});

// Evento de Ativação: Limpeza de Caches Antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Cache antigo encontrado. Deletando:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Sugestão: Assegura que o SW ativado controle os clientes imediatamente
});

// Evento de Fetch: Intercepta todas as requisições da página.
self.addEventListener('fetch', event => {
    // Apenas intercepta requisições GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se encontrou no cache, retorna.
                if (response) {
                    return response;
                }

                // Se não encontrou, vai para a internet buscar.
                return fetch(event.request).catch(error => {
                    // Sugestão: Trata a falha de rede (usuário offline tentando um recurso não cacheado)
                    console.warn('[SW] Falha ao buscar recurso na rede:', event.request.url, error);
                    // Opcional: Aqui você pode retornar uma página de fallback, se necessário.
                    // Ex: return caches.match('/offline.html');
                });
            })
    );
});