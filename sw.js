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

// Lista de todos os arquivos que seu site precisa para funcionar offline.
// Eu analisei seu index.html e listei todos os recursos essenciais.
const urlsToCache = [
    // Arquivos principais
    './',
    './index.html',
    './cifras.json', // Nosso banco de dados de cifras
    './assets/css/stylesNew.css',
    './assets/js/scriptNew.js',
    './assets/js/Pizzicato.min.js',

    // Páginas dos iframes
    './santamissa.html',
    './oracoes.html',

    // Dependências externas (CDNs) - CRÍTICO para o modo offline!
    'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.8.1/font/bootstrap-icons.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
    'https://code.jquery.com/jquery-3.3.1.slim.min.js',
    'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js'
];

// Evento de Instalação: Salva todos os arquivos listados no cache.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto. Adicionando arquivos essenciais para modo offline.');
                return cache.addAll(urlsToCache);
            })
    );
});

// Evento de Fetch: Intercepta todas as requisições da página.
self.addEventListener('fetch', event => {
    event.respondWith(
        // 1. Tenta encontrar o recurso no cache.
        caches.match(event.request)
            .then(response => {
                // Se encontrou no cache, retorna o arquivo salvo. A página carrega instantaneamente.
                if (response) {
                    return response;
                }
                // Se não encontrou, vai para a internet buscar o recurso.
                return fetch(event.request);
            }
            )
    );
});
