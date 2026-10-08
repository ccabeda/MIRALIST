import test from 'node:test';
import assert from 'node:assert/strict';
import { fromMal, fromTmdb } from '../services/catalog/adapters.js';
import { cachedJson } from '../services/catalog/http.js';
import { mergeCatalog } from '../domain/catalog-registry.js';
import { makeBackup, readBackup } from '../domain/backup.js';
import { createCatalogApi } from '../../server/catalog-api.js';
import { normalizeEntry } from '../domain/entry-validation.js';
import { searchCatalog, loadTitle } from '../services/catalog/providers.js';

test('el catálogo no hace consultas vacías o cortas y envía solo el texto buscado con su página', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return Response.json({
      data: [
        { node: { id: 71, title: 'Dragon ONA', media_type: 'ona' } },
        { node: { id: 72, title: 'Dragon Movie', media_type: 'movie' } },
      ],
      paging: { next: 'https://api.myanimelist.net/v2/anime?offset=48' },
    });
  };
  try {
    for (const category of ['Anime', 'Series', 'Películas']) {
      for (const query of ['', ' ', 'd', 'dr', '  dr  ']) {
        assert.deepEqual(await searchCatalog({ category, query, format: 'Todos', page: 1 }), {
          items: [],
          hasNext: false,
        });
      }
    }
    assert.equal(requests.length, 0);
    const result = await searchCatalog({
      category: 'Anime',
      query: ' dra ',
      format: 'ONA',
      page: 2,
    });
    assert.equal(requests.length, 1);
    const url = new URL(requests[0], 'http://localhost');
    assert.equal(url.pathname, '/api/catalog/mal');
    assert.equal(url.searchParams.get('query'), 'dra');
    assert.equal(url.searchParams.get('page'), '2');
    assert.deepEqual(
      result.items.map((item) => item.id),
      ['mal-71'],
    );
    assert.equal(url.searchParams.has('order_by'), false);
    assert.equal(result.hasNext, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('MyAnimeList conserva formatos, fechas, portada y un total desconocido', () => {
  const source = {
    id: 42,
    title: 'Original',
    alternative_titles: { en: 'Translated', ja: '原作' },
    media_type: 'ona',
    num_episodes: 0,
    mean: 7.3,
    num_list_users: 500,
    start_date: '2026-03-01',
    end_date: null,
    average_episode_duration: 1440,
    main_picture: { large: 'https://cdn.myanimelist.net/a.jpg' },
    synopsis: '<p>Una historia</p>',
    genres: [{ name: 'Fantasy' }],
  };
  const title = fromMal(source);
  assert.equal(title.format, 'ONA');
  assert.equal(title.total, null);
  assert.equal(title.metadata.averageScore, 73);
  assert.equal(title.metadata.meanScore, undefined);
  assert.equal(title.metadata.popularity, 500);
  assert.equal(title.metadata.startDate, '2026-03-01');
  assert.equal(title.metadata.endDate, null);
  assert.equal(title.metadata.duration, '24 min');
  assert.equal(title.metadata.favorites, null);
  assert.equal(fromMal({ ...source, start_date: '2026' }).metadata.startDate, null);
  assert.equal(title.genre, 'Fantasía');
  assert.equal(title.description, 'Una historia');
  assert.ok(title.aliases.includes('原作'));
  for (const [type, expected] of [
    ['ova', 'OVA'],
    ['movie', 'Película'],
    ['special', 'Especial'],
    ['tv', 'TV'],
  ])
    assert.equal(fromMal({ ...source, media_type: type }).format, expected);
  assert.equal(fromMal({ ...source, media_type: 'movie' }).total, 1);
  const library = { [title.id]: { status: 'Viendo', progress: 5, score: 3, catalog: title } };
  const restored = readBackup(JSON.stringify(makeBackup(library, [], [title])), []);
  assert.equal(restored.library[title.id].catalog.cover, title.cover);
});

test('TMDB separa IDs de películas y series y no inventa capítulos en resultados de búsqueda', () => {
  const movie = fromTmdb(
    { id: 7, title: 'Película', release_date: '2025-01-01', vote_count: 0, vote_average: 0 },
    'movie',
  );
  const tv = fromTmdb(
    { id: 7, name: 'Serie', first_air_date: '2025-01-01', poster_path: '/poster.jpg' },
    'tv',
  );
  assert.notEqual(movie.id, tv.id);
  assert.equal(movie.total, 1);
  assert.equal(movie.metadata.averageScore, null);
  assert.equal(tv.total, null);
  assert.equal(tv.cover, 'https://image.tmdb.org/t/p/w500/poster.jpg');
  const detail = fromTmdb(
    {
      id: 7,
      name: 'Serie',
      number_of_episodes: 12,
      seasons: [
        { season_number: 0, episode_count: 2 },
        { season_number: 1, episode_count: 12 },
      ],
    },
    'tv',
  );
  assert.deepEqual(detail.seasons, [{ number: 1, total: 12 }]);
  const updated = { ...detail, total: 20, seasons: [...detail.seasons, { number: 2, total: 8 }] };
  const saved = {
    status: 'Viendo',
    progress: 12,
    score: 3,
    seasonProgress: { 1: 12 },
    notes: 'Conservar',
  };
  assert.equal(normalizeEntry(saved, updated).notes, 'Conservar');
});

test('el registro conserva IDs antiguos y no reemplaza fichas completas por relaciones resumidas', () => {
  const legacy = {
    id: 'old',
    title: 'Una obra',
    aliases: ['Otra traducción'],
    category: 'Anime',
    format: 'TV',
    year: 2000,
    total: 12,
    franchise: 'saga',
  };
  const api = fromMal({
    id: 50,
    title: 'Otra traducción',
    media_type: 'tv',
    start_date: '2000-01-01',
    num_episodes: 12,
  });
  const merged = mergeCatalog([legacy], [api]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'old');
  assert.equal(merged[0].providerIds.mal, 50);
  assert.equal(merged[0].franchise, 'saga');
  const summary = fromMal({ id: 50, title: 'Una obra' });
  assert.deepEqual(mergeCatalog(merged, [summary]), merged);
  const detailed = {
    ...api,
    metadata: { ...api.metadata, detailLevel: 'full', studios: 'Estudio' },
  };
  assert.deepEqual(mergeCatalog([detailed], [api]), [detailed]);
  assert.equal(
    mergeCatalog(merged, [{ ...api, id: 'mal-51', providerIds: { mal: 51 } }]).length,
    2,
  );
});

test('la caché comparte consultas en curso y respuestas recientes', async () => {
  let calls = 0;
  let resolve;
  const fetcher = () => {
    calls++;
    return new Promise((done) => {
      resolve = done;
    });
  };
  const first = cachedJson('https://cache.test/search?q=anime', { fetcher });
  const second = cachedJson('https://cache.test/search?q=anime', { fetcher });
  assert.equal(first, second);
  resolve(Response.json({ results: [1] }));
  assert.deepEqual(await first, { results: [1] });
  assert.deepEqual(await cachedJson('https://cache.test/search?q=anime', { fetcher }), {
    results: [1],
  });
  assert.equal(calls, 1);
});

test('los errores se pueden reintentar y el límite 429 frena solicitudes nuevas', async () => {
  let calls = 0;
  const fetcher = async () =>
    ++calls === 1 ? new Response('', { status: 500 }) : Response.json({ ok: true });
  await assert.rejects(cachedJson('https://retry.test/search', { fetcher }));
  assert.deepEqual(await cachedJson('https://retry.test/search', { fetcher }), { ok: true });
  let limitedCalls = 0;
  const limited = async () => {
    limitedCalls++;
    return new Response('', { status: 429, headers: { 'Retry-After': '60' } });
  };
  await assert.rejects(cachedJson('https://limited.test/1', { fetcher: limited }), {
    code: 'rate-limit',
  });
  await assert.rejects(cachedJson('https://limited.test/2', { fetcher: limited }), {
    code: 'rate-limit',
  });
  assert.equal(limitedCalls, 1);
});

async function callApi(handler, url, method = 'GET') {
  const result = { headers: {} };
  await handler(
    { url, method },
    {
      setHeader(name, value) {
        result.headers[name] = value;
      },
      writeHead(status, headers) {
        result.status = status;
        Object.assign(result.headers, headers);
      },
      end(body) {
        result.body = JSON.parse(body);
      },
    },
  );
  return result;
}

test('MyAnimeList usa Client ID en el servidor, pagina por offset y valida las consultas', async () => {
  const seen = [];
  const handler = createCatalogApi({
    malClientId: 'private-test-id',
    fetcher: async (url, options) => {
      seen.push({ url: new URL(url), options });
      return Response.json({ data: [], paging: {} });
    },
  });
  assert.deepEqual((await callApi(handler, '/api/catalog/config')).body, {
    mal: true,
    tmdb: false,
  });
  assert.equal((await callApi(createCatalogApi(), '/api/catalog/mal?query=dra')).status, 503);
  for (const query of [
    '',
    '?query=dr',
    '?query=dra&page=0',
    '?query=dra&page=1.5',
    '?id=../users',
    '?id=0',
  ])
    assert.equal((await callApi(handler, `/api/catalog/mal${query}`)).status, 400);
  assert.equal((await callApi(handler, '/api/catalog/mal?query=dra', 'POST')).status, 405);
  assert.equal(seen.length, 0);
  const response = await callApi(handler, '/api/catalog/mal?query=dra&page=2');
  assert.equal(response.status, 200);
  assert.equal(seen[0].url.origin, 'https://api.myanimelist.net');
  assert.equal(seen[0].url.pathname, '/v2/anime');
  assert.equal(seen[0].url.searchParams.get('q'), 'dra');
  assert.equal(seen[0].url.searchParams.get('offset'), '24');
  assert.equal(seen[0].options.headers['X-MAL-CLIENT-ID'], 'private-test-id');
  assert.ok(!JSON.stringify(response).includes('private-test-id'));
  await callApi(handler, '/api/catalog/mal?id=21');
  assert.equal(seen[1].url.pathname, '/v2/anime/21');
  assert.ok(seen[1].url.searchParams.get('fields').includes('recommendations'));
  for (const status of [401, 403, 429, 500]) {
    const failed = createCatalogApi({
      malClientId: 'invalid',
      fetcher: async () => new Response('', { status }),
    });
    const result = await callApi(failed, '/api/catalog/mal?query=dra');
    assert.equal(result.status, [401, 403].includes(status) ? 503 : status === 429 ? 429 : 502);
    if (status === 429) assert.equal(result.headers['Retry-After'], '60');
  }
});

test('la ficha oficial conserva el ID guardado y obtiene relaciones y recomendaciones en una consulta', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(url);
    return Response.json({
      id: 777,
      title: 'Dragon',
      media_type: 'tv',
      related_anime: [{ node: { id: 778, title: 'Dragon OVA' } }],
      recommendations: [{ node: { id: 779, title: 'Otro anime' } }],
    });
  };
  try {
    const result = await loadTitle({ id: 'old-dragon', providerIds: { mal: 777 } });
    assert.equal(result.title.id, 'old-dragon');
    assert.equal(result.title.metadata.detailLevel, 'full');
    assert.deepEqual(
      result.related.map((item) => item.id),
      ['mal-778'],
    );
    assert.deepEqual(
      result.recommendations.map((item) => item.id),
      ['mal-779'],
    );
    assert.equal(requests.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('el proxy informa configuración sin exponer credenciales y restringe destinos', async () => {
  const seen = [];
  const handler = createCatalogApi({
    token: 'test-token',
    fetcher: async (url, options) => {
      seen.push({ url: String(url), options });
      return Response.json({ results: [], total_pages: 1 });
    },
  });
  assert.deepEqual((await callApi(handler, '/api/catalog/config')).body, {
    tmdb: true,
    mal: false,
  });
  assert.equal((await callApi(createCatalogApi(), '/api/catalog/tmdb?kind=movie')).status, 503);
  for (const url of [
    '/api/catalog/tmdb?kind=https://evil.test',
    '/api/catalog/tmdb?kind=movie&id=../account',
    '/api/catalog/tmdb?kind=tv&page=-1',
  ])
    assert.equal((await callApi(handler, url)).status, 400);
  assert.equal((await callApi(handler, '/api/catalog/tmdb?kind=movie', 'POST')).status, 405);
  assert.equal(seen.length, 0);
  const response = await callApi(handler, '/api/catalog/tmdb?kind=movie&query=Batman&page=2');
  assert.equal(response.status, 200);
  const url = new URL(seen[0].url);
  assert.equal(url.origin, 'https://api.themoviedb.org');
  assert.equal(url.pathname, '/3/search/movie');
  assert.equal(url.searchParams.get('query'), 'Batman');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(seen[0].options.headers.Authorization, 'Bearer test-token');
  assert.ok(!JSON.stringify(response).includes('test-token'));
});
