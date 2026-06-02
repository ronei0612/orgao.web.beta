const version = '6.0.5';
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
    './assets/lib/js/Popper/1.14.7/popper.min.js',
    './assets/lib/js/Select2/4.1.0-rc.0/select2.min.js',
    './assets/lib/js/Vexflow/4.2.5/vexflow.js',

    './santamissa.html',
    './oracoes.html',

    './assets/icons/v2/avancar.svg',
    './assets/icons/menu.svg',
    './assets/icons/dash-lg.svg',
    './assets/icons/dash.svg',
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

    './assets/audio/Strings/strings_a.ogg',
    './assets/audio/Strings/strings_a_.ogg',
    './assets/audio/Strings/strings_a_baixo.ogg',
    './assets/audio/Strings/strings_a_grave.ogg',
    './assets/audio/Strings/strings_a__baixo.ogg',
    './assets/audio/Strings/strings_a__grave.ogg',
    './assets/audio/Strings/strings_b.ogg',
    './assets/audio/Strings/strings_b_baixo.ogg',
    './assets/audio/Strings/strings_b_grave.ogg',
    './assets/audio/Strings/strings_c.ogg',
    './assets/audio/Strings/strings_c_.ogg',
    './assets/audio/Strings/strings_c_baixo.ogg',
    './assets/audio/Strings/strings_c_grave.ogg',
    './assets/audio/Strings/strings_c__baixo.ogg',
    './assets/audio/Strings/strings_c__grave.ogg',
    './assets/audio/Strings/strings_d.ogg',
    './assets/audio/Strings/strings_d_.ogg',
    './assets/audio/Strings/strings_d_baixo.ogg',
    './assets/audio/Strings/strings_d_grave.ogg',
    './assets/audio/Strings/strings_d__baixo.ogg',
    './assets/audio/Strings/strings_d__grave.ogg',
    './assets/audio/Strings/strings_e.ogg',
    './assets/audio/Strings/strings_e_baixo.ogg',
    './assets/audio/Strings/strings_e_grave.ogg',
    './assets/audio/Strings/strings_f.ogg',
    './assets/audio/Strings/strings_f_.ogg',
    './assets/audio/Strings/strings_f_baixo.ogg',
    './assets/audio/Strings/strings_f_grave.ogg',
    './assets/audio/Strings/strings_f__baixo.ogg',
    './assets/audio/Strings/strings_f__grave.ogg',
    './assets/audio/Strings/strings_g.ogg',
    './assets/audio/Strings/strings_g_.ogg',
    './assets/audio/Strings/strings_g_baixo.ogg',
    './assets/audio/Strings/strings_g_grave.ogg',
    './assets/audio/Strings/strings_g__baixo.ogg',
    './assets/audio/Strings/strings_g__grave.ogg',

    './assets/audio/studio/Orgao/orgao_a.ogg',
    './assets/audio/studio/Orgao/orgao_a_baixo.ogg',
    './assets/audio/studio/Orgao/orgao_a_grave.ogg',
    './assets/audio/studio/Orgao/orgao_a_.ogg',
    './assets/audio/studio/Orgao/orgao_a__baixo.ogg',
    './assets/audio/studio/Orgao/orgao_a__grave.ogg',
    './assets/audio/studio/Orgao/orgao_b.ogg',
    './assets/audio/studio/Orgao/orgao_b_baixo.ogg',
    './assets/audio/studio/Orgao/orgao_b_grave.ogg',
    './assets/audio/studio/Orgao/orgao_c.ogg',
    './assets/audio/studio/Orgao/orgao_c_baixo.ogg',
    './assets/audio/studio/Orgao/orgao_c_grave.ogg',
    './assets/audio/studio/Orgao/orgao_c_.ogg',
    './assets/audio/studio/Orgao/orgao_c__baixo.ogg',
    './assets/audio/studio/Orgao/orgao_c__grave.ogg',
    './assets/audio/studio/Orgao/orgao_d.ogg',
    './assets/audio/studio/Orgao/orgao_d_baixo.ogg',
    './assets/audio/studio/Orgao/orgao_d_grave.ogg',
    './assets/audio/studio/Orgao/orgao_d_.ogg',
    './assets/audio/studio/Orgao/orgao_d__baixo.ogg',
    './assets/audio/studio/Orgao/orgao_d__grave.ogg',
    './assets/audio/studio/Orgao/orgao_e.ogg',
    './assets/audio/studio/Orgao/orgao_e_baixo.ogg',
    './assets/audio/studio/Orgao/orgao_e_grave.ogg',
    './assets/audio/studio/Orgao/orgao_f.ogg',
    './assets/audio/studio/Orgao/orgao_f_baixo.ogg',
    './assets/audio/studio/Orgao/orgao_f_grave.ogg',
    './assets/audio/studio/Orgao/orgao_f_.ogg',
    './assets/audio/studio/Orgao/orgao_f__baixo.ogg',
    './assets/audio/studio/Orgao/orgao_f__grave.ogg',
    './assets/audio/studio/Orgao/orgao_g.ogg',
    './assets/audio/studio/Orgao/orgao_g_baixo.ogg',
    './assets/audio/studio/Orgao/orgao_g_grave.ogg',
    './assets/audio/studio/Orgao/orgao_g_.ogg',
    './assets/audio/studio/Orgao/orgao_g__baixo.ogg',
    './assets/audio/studio/Orgao/orgao_g__grave.ogg',

    // Dependências externas (CDNs) - CRÍTICO para o modo offline!
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

// Evento de instalação do Service Worker - Baixa os arquivos e coloca no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Armazenando arquivos no cache...');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Evento de ativação - Limpa caches antigos de versões anteriores, se houver
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Limpando cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Evento de busca (Fetch) - Intercepta requisições e serve os arquivos salvos no cache primeiro
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Se o arquivo estiver no cache, retorna ele. Senão, busca na rede.
                return cachedResponse || fetch(event.request);
            })
    );
});