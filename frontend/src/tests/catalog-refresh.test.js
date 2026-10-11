import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedJson } from '../services/catalog/http.js';
import { createAnimeSchedule } from '../../server/anime-schedule.js';

test('actualizar omite caché, comparte consultas pendientes y respeta 429', async () => {
  let calls = 0;
  let resolve;
  const url = 'https://refresh.test/api/catalog/mal?id=21';
  const fetcher = async () => {
    calls++;
    if (calls === 1) return Response.json({ version: 1 });
    return new Promise((done) => {
      resolve = done;
    });
  };
  assert.deepEqual(await cachedJson(url, { fetcher }), { version: 1 });
  await cachedJson(url, { fetcher });
  assert.equal(calls, 1);
  const first = cachedJson(url, { fetcher, force: true });
  const second = cachedJson(url, { fetcher, force: true });
  resolve(Response.json({ version: 2 }));
  assert.deepEqual(await first, { version: 2 });
  assert.deepEqual(await second, { version: 2 });
  assert.equal(calls, 2);
  let limited = 0;
  const blockedFetcher = async () => {
    limited++;
    return new Response('', { status: 429 });
  };
  const blocked = 'https://refresh-blocked.test/api/catalog/mal?id=1';
  await assert.rejects(cachedJson(blocked, { fetcher: blockedFetcher, force: true }));
  await assert.rejects(cachedJson(blocked, { fetcher: blockedFetcher, force: true }), {
    code: 'rate-limit',
  });
  assert.equal(limited, 1);
});

test('actualizar calendario renueva caché del servidor una vez por lote', async () => {
  let time = Date.parse('2026-10-08T12:00:00Z');
  let calls = 0;
  const handler = createAnimeSchedule({
    token: 'test',
    now: () => time,
    fetcher: async (url) => {
      calls++;
      return Response.json(
        url.includes('/anime?')
          ? { anime: [{ route: 'anime', websites: { mal: 'myanimelist.net/anime/21' } }] }
          : [],
      );
    },
  });
  const call = async (refresh = '') => {
    await handler(new URL(`http://localhost/?malId=21&refresh=${refresh}`), {}, (_, status) =>
      assert.equal(status, 200),
    );
  };
  await call();
  await call();
  assert.equal(calls, 4);
  time += 1000;
  await Promise.all([call(time), call(time)]);
  assert.equal(calls, 8);
  await call(time);
  assert.equal(calls, 8);
});
