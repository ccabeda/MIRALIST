import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnimeSchedule, isoWeek, nextEpisode } from '../../server/anime-schedule.js';
import { animeReleaseInfo } from '../services/catalog/schedule.js';

const now = Date.parse('2026-10-08T12:00:00Z');
test('calendario: cambio de año ISO, episodios pasados y retrasos sin fecha', () => {
  assert.deepEqual(isoWeek(new Date('2027-01-01T12:00:00Z')), { year: 2026, week: 53 });
  const row = {
    route: 'anime',
    airType: 'raw',
    episodeNumber: 2,
    episodeDate: '2026-10-09T00:00:00Z',
  };
  assert.equal(nextEpisode([row], 'anime', now).episode, 2);
  assert.equal(nextEpisode([row], 'other', now), null);
  assert.equal(nextEpisode([row], 'anime', now + 86400000), null);
  assert.equal(
    nextEpisode(
      [{ ...row, airingStatus: 'delayed-air', delayedUntil: '0001-01-01T00:00:00Z' }],
      'anime',
      now,
    ),
    null,
  );
  assert.equal(nextEpisode([{ ...row, airType: 'dub' }], 'anime', now), null);
  assert.equal(
    nextEpisode(
      [{ ...row, airingStatus: 'delayed-air', delayedUntil: '2026-10-12T00:00:00Z' }],
      'anime',
      now,
    ).date,
    '2026-10-12T00:00:00Z',
  );
});

test('proxy: cruza por MAL, comparte calendario y nunca expone el token', async () => {
  const calls = [];
  const handler = createAnimeSchedule({
    token: 'private-token',
    now: () => now,
    fetcher: async (url, options) => {
      calls.push(url);
      assert.equal(options.headers.Authorization, 'Bearer private-token');
      if (url.includes('/anime?'))
        return Response.json({
          anime: [{ route: 'anime', websites: { mal: 'myanimelist.net/anime/21/One_Piece' } }],
        });
      return Response.json([
        { route: 'anime', airType: 'raw', episodeNumber: 2, episodeDate: '2026-10-09T00:00:00Z' },
      ]);
    },
  });
  const call = async (id) => {
    let result;
    await handler(new URL(`http://localhost/?malId=${id}`), {}, (_, status, body) => {
      result = { status, body };
    });
    return result;
  };
  assert.equal((await call('../secrets')).status, 400);
  const [a, b] = await Promise.all([call(21), call(21)]);
  assert.equal(a.body.next.episode, 2);
  assert.deepEqual(a, b);
  assert.equal(calls.length, 4);
  assert.ok(calls.every((url) => url.startsWith('https://animeschedule.net/api/v3/')));
  assert.ok(!JSON.stringify(a).includes('private-token'));
  assert.equal((await call(99)).body.matched, false);
});

test('calendario: errores recuperables, límite de consultas y credencial ausente', async () => {
  let count = 0;
  const handler = createAnimeSchedule({
    token: 'test',
    now: () => now,
    fetcher: async () => {
      count++;
      return new Response('', { status: 429 });
    },
  });
  const statuses = [];
  const response = { setHeader: () => {} };
  for (let i = 0; i < 2; i++)
    await handler(new URL('http://localhost/?malId=21'), response, (_, status) =>
      statuses.push(status),
    );
  assert.deepEqual(statuses, [429, 429]);
  assert.equal(count, 1);
  await createAnimeSchedule()(new URL('http://localhost/?malId=21'), response, (_, status) =>
    assert.equal(status, 503),
  );
  assert.equal(
    animeReleaseInfo({ next: { date: '2026-10-07T00:00:00Z', episode: 1 } }, now).date,
    null,
  );
  assert.match(animeReleaseInfo(null).text, /No se pudo consultar/);
  assert.match(animeReleaseInfo({ delayed: true }).text, /pausada/);
  assert.match(
    animeReleaseInfo({ next: { date: '2026-10-09T00:00:00Z', episode: 2 } }, now).text,
    /Episodio 2/,
  );
});
