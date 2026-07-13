const version = '6.1.2';
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

    './assets/audio/Epiano/epiano_a.ogg',
    './assets/audio/Epiano/epiano_a_baixo.ogg',
    './assets/audio/Epiano/epiano_a_grave.ogg',
    './assets/audio/Epiano/epiano_a_.ogg',
    './assets/audio/Epiano/epiano_a__baixo.ogg',
    './assets/audio/Epiano/epiano_a__grave.ogg',
    './assets/audio/Epiano/epiano_b.ogg',
    './assets/audio/Epiano/epiano_b_baixo.ogg',
    './assets/audio/Epiano/epiano_b_grave.ogg',
    './assets/audio/Epiano/epiano_c.ogg',
    './assets/audio/Epiano/epiano_c_baixo.ogg',
    './assets/audio/Epiano/epiano_c_grave.ogg',
    './assets/audio/Epiano/epiano_c_.ogg',
    './assets/audio/Epiano/epiano_c__baixo.ogg',
    './assets/audio/Epiano/epiano_c__grave.ogg',
    './assets/audio/Epiano/epiano_d.ogg',
    './assets/audio/Epiano/epiano_d_baixo.ogg',
    './assets/audio/Epiano/epiano_d_grave.ogg',
    './assets/audio/Epiano/epiano_d_.ogg',
    './assets/audio/Epiano/epiano_d__baixo.ogg',
    './assets/audio/Epiano/epiano_d__grave.ogg',
    './assets/audio/Epiano/epiano_e.ogg',
    './assets/audio/Epiano/epiano_e_baixo.ogg',
    './assets/audio/Epiano/epiano_e_grave.ogg',
    './assets/audio/Epiano/epiano_f.ogg',
    './assets/audio/Epiano/epiano_f_baixo.ogg',
    './assets/audio/Epiano/epiano_f_grave.ogg',
    './assets/audio/Epiano/epiano_f_.ogg',
    './assets/audio/Epiano/epiano_f__baixo.ogg',
    './assets/audio/Epiano/epiano_f__grave.ogg',
    './assets/audio/Epiano/epiano_g.ogg',
    './assets/audio/Epiano/epiano_g_baixo.ogg',
    './assets/audio/Epiano/epiano_g_grave.ogg',
    './assets/audio/Epiano/epiano_g_.ogg',
    './assets/audio/Epiano/epiano_g__baixo.ogg',
    './assets/audio/Epiano/epiano_g__grave.ogg',

    './assets/audio/studio/Flauta/flauta_a3.ogg',
    './assets/audio/studio/Flauta/flauta_a4.ogg',
    './assets/audio/studio/Flauta/flauta_a_3.ogg',
    './assets/audio/studio/Flauta/flauta_a_4.ogg',
    './assets/audio/studio/Flauta/flauta_b3.ogg',
    './assets/audio/studio/Flauta/flauta_b4.ogg',
    './assets/audio/studio/Flauta/flauta_c4.ogg',
    './assets/audio/studio/Flauta/flauta_c5.ogg',
    './assets/audio/studio/Flauta/flauta_c_4.ogg',
    './assets/audio/studio/Flauta/flauta_c_5.ogg',
    './assets/audio/studio/Flauta/flauta_d4.ogg',
    './assets/audio/studio/Flauta/flauta_d5.ogg',
    './assets/audio/studio/Flauta/flauta_d_4.ogg',
    './assets/audio/studio/Flauta/flauta_d_5.ogg',
    './assets/audio/studio/Flauta/flauta_e4.ogg',
    './assets/audio/studio/Flauta/flauta_e5.ogg',
    './assets/audio/studio/Flauta/flauta_f4.ogg',
    './assets/audio/studio/Flauta/flauta_f5.ogg',
    './assets/audio/studio/Flauta/flauta_f_4.ogg',
    './assets/audio/studio/Flauta/flauta_f_5.ogg',
    './assets/audio/studio/Flauta/flauta_g3.ogg',
    './assets/audio/studio/Flauta/flauta_g4.ogg',
    './assets/audio/studio/Flauta/flauta_g5.ogg',
    './assets/audio/studio/Flauta/flauta_g_3.ogg',
    './assets/audio/studio/Flauta/flauta_g_4.ogg',

    './assets/audio/studio/Drums/0.ogg',
    './assets/audio/studio/Drums/1.ogg',
    './assets/audio/studio/Drums/2.ogg',
    './assets/audio/studio/Drums/aberto.ogg',
    './assets/audio/studio/Drums/aro.ogg',
    './assets/audio/studio/Drums/baixo_a.ogg',
    './assets/audio/studio/Drums/baixo_a_.ogg',
    './assets/audio/studio/Drums/baixo_b.ogg',
    './assets/audio/studio/Drums/baixo_c.ogg',
    './assets/audio/studio/Drums/baixo_c_.ogg',
    './assets/audio/studio/Drums/baixo_d.ogg',
    './assets/audio/studio/Drums/baixo_d_.ogg',
    './assets/audio/studio/Drums/baixo_e.ogg',
    './assets/audio/studio/Drums/baixo_f.ogg',
    './assets/audio/studio/Drums/baixo_f_.ogg',
    './assets/audio/studio/Drums/baixo_g.ogg',
    './assets/audio/studio/Drums/baixo_g_.ogg',
    './assets/audio/studio/Drums/brush-01.ogg',
    './assets/audio/studio/Drums/brush-02--.ogg',
    './assets/audio/studio/Drums/brush-02-.ogg',
    './assets/audio/studio/Drums/brush-02.ogg',
    './assets/audio/studio/Drums/brush-03.ogg',
    './assets/audio/studio/Drums/bumbo.ogg',
    './assets/audio/studio/Drums/caixa-low.ogg',
    './assets/audio/studio/Drums/caixa.ogg',
    './assets/audio/studio/Drums/chimbal.ogg',
    './assets/audio/studio/Drums/chimbal2.ogg',
    './assets/audio/studio/Drums/cravo_a.ogg',
    './assets/audio/studio/Drums/cravo_a_.ogg',
    './assets/audio/studio/Drums/cravo_b.ogg',
    './assets/audio/studio/Drums/cravo_c.ogg',
    './assets/audio/studio/Drums/cravo_c_.ogg',
    './assets/audio/studio/Drums/cravo_d.ogg',
    './assets/audio/studio/Drums/cravo_d_.ogg',
    './assets/audio/studio/Drums/cravo_e.ogg',
    './assets/audio/studio/Drums/cravo_f.ogg',
    './assets/audio/studio/Drums/cravo_f_.ogg',
    './assets/audio/studio/Drums/cravo_g.ogg',
    './assets/audio/studio/Drums/cravo_g_.ogg',
    './assets/audio/studio/Drums/meialua.ogg',
    './assets/audio/studio/Drums/meialua1.ogg',
    './assets/audio/studio/Drums/meialua2.ogg',
    './assets/audio/studio/Drums/prato1.ogg',
    './assets/audio/studio/Drums/prato2.ogg',
    './assets/audio/studio/Drums/ride-low.ogg',
    './assets/audio/studio/Drums/ride.ogg',
    './assets/audio/studio/Drums/shaker.ogg',
    './assets/audio/studio/Drums/tom-01.ogg',
    './assets/audio/studio/Drums/tom-02.ogg',
    './assets/audio/studio/Drums/tom-03.ogg',
    './assets/audio/studio/Drums/tom.ogg',
    './assets/audio/studio/Drums/violao_.ogg',
    './assets/audio/studio/Drums/violao_a.ogg',
    './assets/audio/studio/Drums/violao_a1.ogg',
    './assets/audio/studio/Drums/violao_a_.ogg',
    './assets/audio/studio/Drums/violao_a_1.ogg',
    './assets/audio/studio/Drums/violao_a_m.ogg',
    './assets/audio/studio/Drums/violao_a_m1.ogg',
    './assets/audio/studio/Drums/violao_am.ogg',
    './assets/audio/studio/Drums/violao_am1.ogg',
    './assets/audio/studio/Drums/violao_b.ogg',
    './assets/audio/studio/Drums/violao_b1.ogg',
    './assets/audio/studio/Drums/violao_bm.ogg',
    './assets/audio/studio/Drums/violao_bm1.ogg',
    './assets/audio/studio/Drums/violao_c.ogg',
    './assets/audio/studio/Drums/violao_c1.ogg',
    './assets/audio/studio/Drums/violao_c_.ogg',
    './assets/audio/studio/Drums/violao_c_1.ogg',
    './assets/audio/studio/Drums/violao_c_m.ogg',
    './assets/audio/studio/Drums/violao_c_m1.ogg',
    './assets/audio/studio/Drums/violao_cm.ogg',
    './assets/audio/studio/Drums/violao_cm1.ogg',
    './assets/audio/studio/Drums/violao_d.ogg',
    './assets/audio/studio/Drums/violao_d1.ogg',
    './assets/audio/studio/Drums/violao_d_.ogg',
    './assets/audio/studio/Drums/violao_d_1.ogg',
    './assets/audio/studio/Drums/violao_d_m.ogg',
    './assets/audio/studio/Drums/violao_d_m1.ogg',
    './assets/audio/studio/Drums/violao_dm.ogg',
    './assets/audio/studio/Drums/violao_dm1.ogg',
    './assets/audio/studio/Drums/violao_e.ogg',
    './assets/audio/studio/Drums/violao_e1.ogg',
    './assets/audio/studio/Drums/violao_em.ogg',
    './assets/audio/studio/Drums/violao_em1.ogg',
    './assets/audio/studio/Drums/violao_f.ogg',
    './assets/audio/studio/Drums/violao_f1.ogg',
    './assets/audio/studio/Drums/violao_f_.ogg',
    './assets/audio/studio/Drums/violao_f_1.ogg',
    './assets/audio/studio/Drums/violao_f_m.ogg',
    './assets/audio/studio/Drums/violao_f_m1.ogg',
    './assets/audio/studio/Drums/violao_fm.ogg',
    './assets/audio/studio/Drums/violao_fm1.ogg',
    './assets/audio/studio/Drums/violao_g.ogg',
    './assets/audio/studio/Drums/violao_g1.ogg',
    './assets/audio/studio/Drums/violao_g_.ogg',
    './assets/audio/studio/Drums/violao_g_1.ogg',
    './assets/audio/studio/Drums/violao_g_m.ogg',
    './assets/audio/studio/Drums/violao_g_m1.ogg',
    './assets/audio/studio/Drums/violao_gm.ogg',
    './assets/audio/studio/Drums/violao_gm1.ogg',

    // Dependências externas (CDNs) - CRÍTICO para o modo offline!
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

// Evento de Instalação Otimizado (Baixa em paralelo)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            console.log('[SW] Iniciando cache de arquivos em paralelo...');

            // Cria um array de "Promessas" de download
            const cachePromises = urlsToCache.map(async (url) => {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response);
                    } else {
                        console.warn(`[SW AVISO] Arquivo não encontrado (Ignorado): ${url}`);
                    }
                } catch (error) {
                    console.error(`[SW FALHA DE REDE] Erro ao buscar: ${url}`, error);
                }
            });

            // Executa todos os downloads ao mesmo tempo
            await Promise.all(cachePromises);

            console.log('[SW] Processo de cache inicial concluído!');
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
    return self.clients.claim();
});

// Evento de Fetch: Intercepta todas as requisições da página.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // 1. Tem no cache? Retorna imediatamente (Funciona offline)
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Não tem? Busca na rede
            return fetch(event.request).then(networkResponse => {
                // CORREÇÃO: Se a busca deu certo, armazena no cache para a próxima vez!
                // Isso garante que Flauta, Bateria e Epiano fiquem offline após o 1º uso
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return networkResponse;
            }).catch(error => {
                console.warn('[SW] Offline/Falha de rede para o recurso:', event.request.url);
                // Como não tem alert() aqui, o app apenas não toca o som se não tiver internet e não estiver no cache
            });
        })
    );
});

// Escuta a mensagem enviada pelo App.js para atualizar a versão
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
