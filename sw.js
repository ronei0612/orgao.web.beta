const version = '5.9.5';
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

    './assets/icons/v2/avancar.svg',
    './assets/icons/menu.svg',
    './assets/icons/dash-lg.svg',
    './assets/icons/plus-lg.svg',
    './assets/icons/plus.svg',
    './assets/icons/check.svg',
    './assets/icons/plus-square.svg',
    './assets/icons/pencil.svg',
    './assets/icons/trash.svg',
    './assets/icons/pratoBaqueta.svg',
    './assets/icons/bumbo.svg',
    './assets/icons/caixa.svg',
    './assets/icons/chimbal.svg',
    './assets/icons/meiaLua.svg',
    './assets/icons/v2/voltar.svg',
    './assets/icons/play-fill.svg',
    './assets/icons/stop-fill.svg',
    './assets/icons/music-note-beamed.svg',
    './assets/icons/x-circle.svg',
    './assets/icons/search.svg',
    './assets/icons/check.svg',

    './assets/audio/Orgao/orgao_a.ogg',
    './assets/audio/Orgao/orgao_a_.ogg',
    './assets/audio/Orgao/orgao_a_baixo.ogg',
    './assets/audio/Orgao/orgao_a_grave.ogg',
    './assets/audio/Orgao/orgao_a__baixo.ogg',
    './assets/audio/Orgao/orgao_a__grave.ogg',
    './assets/audio/Orgao/orgao_b.ogg',
    './assets/audio/Orgao/orgao_b_baixo.ogg',
    './assets/audio/Orgao/orgao_b_grave.ogg',
    './assets/audio/Orgao/orgao_c.ogg',
    './assets/audio/Orgao/orgao_c_.ogg',
    './assets/audio/Orgao/orgao_c_baixo.ogg',
    './assets/audio/Orgao/orgao_c_grave.ogg',
    './assets/audio/Orgao/orgao_c__baixo.ogg',
    './assets/audio/Orgao/orgao_c__grave.ogg',
    './assets/audio/Orgao/orgao_d.ogg',
    './assets/audio/Orgao/orgao_d_.ogg',
    './assets/audio/Orgao/orgao_d_baixo.ogg',
    './assets/audio/Orgao/orgao_d_grave.ogg',
    './assets/audio/Orgao/orgao_d__baixo.ogg',
    './assets/audio/Orgao/orgao_d__grave.ogg',
    './assets/audio/Orgao/orgao_e.ogg',
    './assets/audio/Orgao/orgao_e_baixo.ogg',
    './assets/audio/Orgao/orgao_e_grave.ogg',
    './assets/audio/Orgao/orgao_f.ogg',
    './assets/audio/Orgao/orgao_f_.ogg',
    './assets/audio/Orgao/orgao_f_baixo.ogg',
    './assets/audio/Orgao/orgao_f_grave.ogg',
    './assets/audio/Orgao/orgao_f__baixo.ogg',
    './assets/audio/Orgao/orgao_f__grave.ogg',
    './assets/audio/Orgao/orgao_g.ogg',
    './assets/audio/Orgao/orgao_g_.ogg',
    './assets/audio/Orgao/orgao_g_baixo.ogg',
    './assets/audio/Orgao/orgao_g_grave.ogg',
    './assets/audio/Orgao/orgao_g__baixo.ogg',
    './assets/audio/Orgao/orgao_g__grave.ogg',

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