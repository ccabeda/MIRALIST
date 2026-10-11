import test from 'node:test';
import assert from 'node:assert/strict';
import { createMalClient } from '../../server/mal-client.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('comparte consultas, serializa peticiones y reutiliza respuestas hasta vencer', async () => {
  let clock = 0;
  const calls = [];
  const first = deferred();
  const request = createMalClient({
    clientId: 'test',
    interval: 0,
    ttl: 100,
    now: () => clock,
    fetcher: async (url) => {
      calls.push(url);
      if (calls.length === 1) await first.promise;
      return Response.json({ url });
    },
  });
  const a = request('a');
  assert.equal(request('a'), a);
  const b = request('b');
  assert.deepEqual(calls, ['a']);
  first.resolve();
  await Promise.all([a, b]);
  assert.deepEqual(calls, ['a', 'b']);
  await request('a');
  assert.equal(calls.length, 2);
  clock = 101;
  await request('a');
  assert.equal(calls.length, 3);
});

test('una petición vencida en cola no llega al proveedor y se puede reintentar', async () => {
  const first = deferred();
  const calls = [];
  const request = createMalClient({
    clientId: 'test',
    interval: 0,
    maxWait: 10,
    fetcher: async (url) => {
      calls.push(url);
      if (url === 'a') await first.promise;
      return Response.json({ url });
    },
  });
  const a = request('a');
  assert.equal((await request('b')).body.error, 'MAL_BUSY');
  first.resolve();
  await a;
  assert.deepEqual(calls, ['a']);
  assert.equal((await request('b')).status, 200);
});

test('respeta Retry-After y no vuelve a consultar durante la pausa', async () => {
  let clock = 0;
  let calls = 0;
  const request = createMalClient({
    clientId: 'test',
    interval: 0,
    now: () => clock,
    fetcher: async () => {
      calls++;
      return calls === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': '5' } })
        : Response.json({ ok: true });
    },
  });
  const first = request('a');
  const queued = request('b');
  assert.equal((await first).retryAfter, '5');
  assert.equal((await queued).status, 429);
  assert.equal((await request('c')).status, 429);
  assert.equal(calls, 1);
  clock = 5001;
  assert.equal((await request('a')).status, 200);
  assert.equal(calls, 2);
});

test('limita la caché y no conserva fallos', async () => {
  let calls = 0;
  const request = createMalClient({
    clientId: 'test',
    interval: 0,
    maxEntries: 1,
    fetcher: async () => {
      if (++calls === 1) throw new TypeError('offline');
      return Response.json({ calls });
    },
  });
  assert.equal((await request('a')).status, 502);
  assert.equal((await request('a')).status, 200);
  await request('b');
  await request('a');
  assert.equal(calls, 4);
});

test('espacia los inicios de las consultas', async () => {
  const starts = [];
  const request = createMalClient({
    clientId: 'test',
    interval: 25,
    fetcher: async () => {
      starts.push(Date.now());
      return Response.json({});
    },
  });
  await Promise.all([request('a'), request('b')]);
  assert.ok(starts[1] - starts[0] >= 20);
});
