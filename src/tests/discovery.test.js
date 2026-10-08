import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recommendationSeeds,
  unseenRecommendations,
  orderSaga,
  releaseInfo,
} from '../domain/discovery.js';
import { fromMal, fromTmdb } from '../services/catalog/adapters.js';
import { loadInBatches, loadSaga } from '../services/catalog/discovery.js';
import { createCatalogApi } from '../../server/catalog-api.js';

const anime = (id, extra = {}) => ({
  id: `mal-${id}`,
  title: `Anime ${id}`,
  category: 'Anime',
  providerIds: { mal: id },
  ...extra,
});
test('recomendaciones: elige favoritos/completados y excluye vistos incluso con IDs antiguos', () => {
  const titles = [anime(1), anime(2), anime(3, { id: 'legacy-3' }), anime(4), anime(5), anime(6)];
  const library = {
    'mal-1': { favorite: true, status: 'Pendiente' },
    'mal-2': { status: 'Completado' },
    'legacy-3': { status: 'Completado' },
    'mal-4': { status: 'Pendiente', progress: 2 },
    'mal-5': { status: 'Viendo' },
  };
  assert.equal(recommendationSeeds(titles, library).length, 3);
  const groups = [
    { seed: titles[0], items: [anime(1), anime(3), anime(4), anime(5), anime(6), anime(7)] },
    { seed: titles[1], items: [anime(6), anime(8)] },
  ];
  assert.deepEqual(
    unseenRecommendations(groups, titles, library).map(({ title }) => title.id),
    ['mal-6', 'mal-8', 'mal-7'],
  );
});
test('saga: diferencia estreno y precedencia de precuelas sin mutar los datos', () => {
  const items = [anime(1, { year: 2000 }), anime(2, { year: 2010 }), anime(3)];
  const relations = [{ from: 'mal-1', to: 'mal-2', type: 'prequel' }];
  assert.deepEqual(
    orderSaga(items, relations, 'release').items.map((t) => t.id),
    ['mal-1', 'mal-2', 'mal-3'],
  );
  assert.deepEqual(
    orderSaga(items, relations, 'suggested').items.map((t) => t.id),
    ['mal-2', 'mal-1', 'mal-3'],
  );
  assert.equal(
    orderSaga(items, [...relations, { from: 'mal-2', to: 'mal-1', type: 'prequel' }], 'suggested')
      .cycle,
    true,
  );
  assert.equal(items[0].id, 'mal-1');
});
test('estrenos: fecha exacta de TMDB, horario japonés de MAL y ausencia de datos sin inventar fechas', () => {
  const title = fromTmdb(
    {
      id: 1,
      name: 'Show',
      status: 'Returning Series',
      next_episode_to_air: { air_date: '2026-10-20', season_number: 2, episode_number: 4 },
    },
    'tv',
  );
  assert.equal(releaseInfo(title, '2026-10-08').date, '2026-10-20');
  assert.equal(releaseInfo(title, '2026-10-21').date, null);
  const mal = fromMal({
    id: 1,
    title: 'Anime',
    status: 'currently_airing',
    broadcast: { day_of_the_week: 'monday', start_time: '23:00' },
  });
  assert.equal(releaseInfo(mal).date, null);
  assert.match(releaseInfo(mal).text, /lunes 23:00.*UTC\+9/);
  assert.equal(releaseInfo({ metadata: {} }).date, null);
  assert.match(releaseInfo({ metadata: { status: 'Finalizado' } }).text, /Finalizada/);
});
test('consultas en lotes: conserva éxitos parciales y respeta cancelación', async () => {
  const outcomes = await loadInBatches([1, 2, 3], async (n) => {
    if (n === 2) throw Error('offline');
    return n;
  });
  assert.deepEqual(
    outcomes.map((item) => item.status),
    ['fulfilled', 'rejected', 'fulfilled'],
  );
  assert.deepEqual(
    await loadInBatches(
      [1],
      () => {
        throw Error('must not run');
      },
      () => false,
    ),
    [],
  );
});
test('saga consulta relaciones reales, deduplica ciclos y conserva sus portadas', async () => {
  const previous = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url) => {
    const id = Number(new URL(url, 'http://localhost').searchParams.get('id'));
    seen.push(id);
    return Response.json({
      id,
      title: `Saga ${id}`,
      media_type: 'tv',
      start_date: '2020-01-01',
      main_picture: { large: 'https://cdn.test/cover.jpg' },
      related_anime: [
        {
          node: { id: id === 910001 ? 910002 : 910001, title: 'Otra entrega' },
          relation_type: id === 910001 ? 'sequel' : 'prequel',
        },
      ],
    });
  };
  try {
    const result = await loadSaga(anime(910001));
    assert.equal(result.items.length, 2);
    assert.equal(result.relations.length, 2);
    assert.equal(result.partial, false);
    assert.equal(seen.length, 2);
    assert.ok(result.items.every((title) => title.cover === 'https://cdn.test/cover.jpg'));
  } finally {
    globalThis.fetch = previous;
  }
});
test('proxy de colecciones solo acepta ID y un destino de TMDB fijo', async () => {
  const seen = [];
  const handler = createCatalogApi({
    token: 'test',
    fetcher: async (url) => {
      seen.push(new URL(url));
      return Response.json({ parts: [] });
    },
  });
  async function call(url) {
    let status;
    await handler(
      { method: 'GET', url },
      {
        writeHead: (code) => {
          status = code;
        },
        end: () => {},
      },
    );
    return status;
  }
  assert.equal(await call('/api/catalog/tmdb?kind=collection'), 400);
  assert.equal(await call('/api/catalog/tmdb?kind=collection&id=../users'), 400);
  assert.equal(await call('/api/catalog/tmdb?kind=collection&id=5'), 200);
  assert.equal(seen[0].href, 'https://api.themoviedb.org/3/collection/5?language=es-ES');
});
