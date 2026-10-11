import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyNotifications,
  mergeNotifications,
  parseNotifications,
  relativeNotificationDate,
} from '../domain/notifications.js';
import { recentEpisodes } from '../../server/anime-schedule.js';
import { loadNotificationUpdate, notificationTitles } from '../services/catalog/notifications.js';

const anime = (id) => ({
  id: `mal-${id}`,
  title: `Anime ${id}`,
  providerIds: { mal: id },
  category: 'Anime',
  format: 'TV',
});
const now = new Date('2026-10-08T12:00:00Z');
test('avisos de anime y series en todos los estados, sin cambiar progreso ni estado', async () => {
  const previous = globalThis.fetch;
  const tv = {
    id: 'tmdb-tv-992100',
    title: 'Serie',
    category: 'Series',
    providerIds: { tmdb: 992100 },
  };
  const movie = { ...tv, id: 'movie', category: 'Películas' };
  const title = anime(992101);
  globalThis.fetch = async (url) => {
    if (String(url).includes('/schedule'))
      return Response.json({ recent: [{ episode: 13, date: now.toISOString() }] });
    if (String(url).includes('/tmdb'))
      return Response.json({
        id: 992100,
        name: 'Serie',
        seasons: [
          { season_number: 1, episode_count: 12 },
          { season_number: 2, episode_count: 1 },
        ],
        last_episode_to_air: { air_date: '2026-10-07', season_number: 2, episode_number: 1 },
      });
    return Response.json({ id: 992101, title: 'Anime', media_type: 'tv' });
  };
  try {
    for (const status of ['Pendiente', 'Viendo', 'Completado', 'Pausado', 'Abandonado']) {
      const entry = { status, progress: 12, seasonProgress: { 1: 12 } };
      const library = { [title.id]: entry, [tv.id]: entry, movie: entry };
      assert.deepEqual(notificationTitles([title, tv, movie, anime(992102)], library), [title, tv]);
      const before = JSON.stringify(entry);
      assert.equal((await loadNotificationUpdate(title, entry)).episodes[0].episode, 13);
      const result = await loadNotificationUpdate(tv, entry);
      assert.equal(result.episodes[0].season, 2);
      assert.equal(result.episodes[0].episode, 1);
      assert.equal(JSON.stringify(entry), before);
    }
    assert.deepEqual(
      (await loadNotificationUpdate(title, { status: 'Completado', progress: 13 })).episodes,
      [],
    );
    assert.equal(
      (await loadNotificationUpdate(tv, { status: 'Completado', seasonProgress: { 1: 12, 2: 1 } }))
        .episodes,
      undefined,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
test('relacionadas: establece referencia, detecta nuevas y evita duplicados entre sagas', () => {
  const original = emptyNotifications();
  const first = mergeNotifications(
    original,
    [
      { title: anime(1), related: [anime(2)] },
      { title: anime(4), related: [] },
    ],
    new Set(),
    now,
  );
  assert.equal(first.items.length, 0);
  const second = mergeNotifications(
    first,
    [
      { title: anime(1), related: [anime(2), anime(3), anime(5)] },
      { title: anime(4), related: [anime(3)] },
    ],
    new Set(['mal-5']),
    now,
  );
  assert.equal(second.items.length, 1);
  assert.match(second.items[0].message, /Nueva entrega detectada/);
  assert.equal(second.items[0].title.id, 'mal-3');
  const read = { ...second, items: second.items.map((item) => ({ ...item, read: true })) };
  const failed = mergeNotifications(read, [{ title: anime(1) }], new Set(), now);
  const refreshed = mergeNotifications(
    parseNotifications(JSON.stringify(failed)),
    [{ title: anime(1), related: [anime(3)] }],
    new Set(),
    now,
  );
  assert.equal(refreshed.items.length, 1);
  assert.equal(refreshed.items[0].read, true);
  assert.ok(refreshed.relations['mal-1'].includes('mal-2'));
  assert.deepEqual(original, emptyNotifications());
});

test('episodios: filtra futuro/antiguos y conserva leídos al volver a consultar', () => {
  const update = {
    title: anime(1),
    episodes: [
      { episode: 1, date: '2026-10-02T14:30:00Z', source: 'AnimeSchedule' },
      { episode: 2, date: '2026-10-09T14:30:00Z', source: 'AnimeSchedule' },
      { episode: 3, date: '2026-09-01T14:30:00Z', source: 'AnimeSchedule' },
    ],
  };
  const first = mergeNotifications(emptyNotifications(), [update], new Set(), now);
  assert.equal(first.items.length, 1);
  first.items[0].read = true;
  assert.equal(mergeNotifications(first, [update], new Set(), now).items.length, 1);
  assert.equal(mergeNotifications(first, [update], new Set(), now).items[0].read, true);
  assert.match(relativeNotificationDate('2026-10-02T12:00:00Z', now.getTime()), /6 días/);
  assert.deepEqual(parseNotifications('{broken'), emptyNotifications());
  assert.deepEqual(parseNotifications('{"items":[null],"seen":[null],"relations":{}}').items, []);
});

test('calendario: solo episodios confirmados emitidos, cruce de semana y sin duplicados', () => {
  const row = {
    route: 'test',
    airType: 'raw',
    airingStatus: 'aired',
    episodeNumber: 1,
    episodeDate: '2026-10-02T14:30:00Z',
  };
  const result = recentEpisodes(
    [
      row,
      row,
      { ...row, episodeNumber: 2, airingStatus: 'unaired' },
      { ...row, episodeNumber: 3, airingStatus: 'delayed-air' },
      { ...row, episodeNumber: 4, airType: 'dub' },
      { ...row, episodeNumber: 5, episodeDate: '2026-10-10T12:00:00Z' },
    ],
    'test',
    now.getTime(),
  );
  assert.deepEqual(result, [{ episode: 1, date: row.episodeDate }]);
});

test('consulta de avisos: excluye capítulos vistos y conserva relaciones si falla el calendario', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/schedule'))
      return Response.json({
        recent: [
          { episode: 1, date: now.toISOString() },
          { episode: 2, date: now.toISOString() },
        ],
      });
    return Response.json({
      id: 991001,
      title: 'Anime',
      media_type: 'tv',
      related_anime: [
        { node: { id: 991002, title: 'Secuela' }, relation_type: 'sequel' },
        { node: { id: 991003, title: 'Cruce' }, relation_type: 'other' },
      ],
    });
  };
  try {
    const result = await loadNotificationUpdate(anime(991001), { status: 'Viendo', progress: 1 });
    assert.equal(result.episodes.length, 1);
    assert.equal(result.episodes[0].episode, 2);
    assert.equal(result.related.length, 1);
    globalThis.fetch = async (url) =>
      String(url).includes('/schedule')
        ? new Response('', { status: 500 })
        : Response.json({ id: 991010, title: 'Otro', related_anime: [] });
    const partial = await loadNotificationUpdate(anime(991010), { status: 'Viendo' });
    assert.equal(partial.errors, 1);
    assert.deepEqual(partial.related, []);
    assert.equal(partial.episodes, undefined);
  } finally {
    globalThis.fetch = previous;
  }
});

test('historial acotado: conserva deduplicación de avisos que salen de los últimos 100', () => {
  const updates = Array.from({ length: 120 }, (_, i) => ({
    title: anime(i + 1),
    episodes: [{ episode: 1, date: now.toISOString(), source: 'AnimeSchedule' }],
  }));
  const state = mergeNotifications(emptyNotifications(), updates, new Set(), now);
  assert.equal(state.items.length, 100);
  assert.equal(state.seen.length, 120);
  assert.equal(mergeNotifications(state, updates, new Set(), now).items.length, 100);
});
