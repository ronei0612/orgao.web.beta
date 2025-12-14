const version = '5.8.7';
const CACHE_NAME = 'cifra-app-cache-' + version;

const urlsToCache = [
    './',
    './index.html',
    './cifras.json',
    './styles.json',
    './styles-melody.json',
    './assets/css/styles.css',
    './assets/css/frames-styles.css',
    './assets/lib/css/Bootstrap/bootstrap-icons/1.8.1/bootstrap-icons.css',
    './assets/lib/css/Bootstrap/bootstrap-icons/1.8.1/fonts/bootstrap-icons.woff2',
    './assets/lib/css/Bootstrap/4.6.2/bootstrap.min.css',
    './assets/js/App.js',
    './assets/js/CifraPlayer.js',
    './assets/js/AudioContextManager.js',
    './assets/js/LocalStorageManager.js',
    './assets/js/MusicTheory.js',
    './assets/js/UIController.js',
    './assets/lib/js/Jquery/3.5.1/jquery.min.js',
    './assets/lib/js/Bootstrap/4.6.1/bootstrap.min.js',

    './santamissa.html',
    './oracoes.html',

    // Dependências externas (CDNs) - CRÍTICO para o modo offline!
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

// Evento de Instalação: Salva todos os arquivos listados no cache.
self.addEventListener('install', event => {
    self.skipWaiting(); // Sugestão: Pula a fase waiting e tenta ativar imediatamente

    event.waitUntil(
        caches.open(CACHE_NAME) // Use a variável CACHE_NAME
            .then(cache => {
                console.log('[SW] Cache aberto. Adicionando arquivos essenciais para modo offline.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                // É importante saber se o addAll falhou, especialmente por causa de CDNs
                console.error('[SW] Falha ao cachear ativos. Isso pode ser um problema de CDN.', error);
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