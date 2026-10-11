import test from 'node:test';
import assert from 'node:assert/strict';
import { createRetryTracker } from '../services/catalog/retry.js';
import { createNotificationChecks } from '../services/catalog/notification-checks.js';
import {
  folderAccepts,
  separateMixedFolders,
  validateFolderSections,
} from '../domain/library-sections.js';
import { createMalClient } from '../../server/mal-client.js';

test('reintentar fuerza solo ese intento, sin afectar otra ficha o búsqueda', () => {
  const retry = createRetryTracker();
  assert.equal(retry('a', 0), false);
  assert.equal(retry('a', 1), true);
  assert.equal(retry('a', 1), false);
  assert.equal(retry('b', 1), false);
  assert.equal(retry('b', 2), true);
});

test('notificaciones conservan revisiones, consultan nuevas obras y reintentan fallos antes', () => {
  let clock = 100;
  const checks = createNotificationChecks({}, () => clock);
  checks.record('a', false);
  checks.record('b', true);
  assert.equal(checks.due('a'), false);
  assert.equal(checks.due('new'), true);
  assert.equal(checks.due('a', true), true);
  clock += 60000;
  assert.equal(checks.due('b'), true);
  const restored = createNotificationChecks(checks.snapshot(), () => clock);
  assert.equal(restored.due('a'), false);
  clock += 900000;
  assert.equal(restored.due('a'), true);
  restored.prune(new Set(['a']));
  assert.equal(restored.snapshot().b, undefined);
});

test('carpetas separan anime de series/películas, incluidas copias antiguas mixtas', () => {
  const titles = [
    { id: 'anime', category: 'Anime' },
    { id: 'anime-film', category: 'Anime', format: 'Película' },
    { id: 'series', category: 'Series' },
    { id: 'film', category: 'Películas' },
  ];
  const folder = { id: 'f', name: 'Favoritas', titleIds: ['anime'] };
  assert.equal(folderAccepts(folder, titles[1], titles), true);
  assert.equal(folderAccepts(folder, titles[2], titles), false);
  assert.equal(folderAccepts({ ...folder, titleIds: ['film'] }, titles[2], titles), true);
  assert.equal(folderAccepts({ ...folder, titleIds: [] }, titles[2], titles), true);
  const old = [{ ...folder, titleIds: ['anime', 'film', 'anime-film', 'series'] }];
  assert.throws(() => validateFolderSections(old, titles));
  const split = separateMixedFolders(old, titles);
  assert.deepEqual(
    split.map((item) => item.titleIds),
    [
      ['anime', 'anime-film'],
      ['film', 'series'],
    ],
  );
  assert.deepEqual(separateMixedFolders(split, titles), split);
  validateFolderSections(split, titles);
  assert.equal(old[0].titleIds.length, 4);
});

test('las fichas adelantan a las consultas de fondo y promueven duplicados pendientes', async () => {
  let release;
  const blocker = new Promise((resolve) => {
    release = resolve;
  });
  const calls = [];
  const request = createMalClient({
    clientId: 'test',
    interval: 0,
    fetcher: async (url) => {
      calls.push(url);
      if (url === 'active') await blocker;
      return Response.json({});
    },
  });
  const active = request('active', 'background');
  const background = request('background', 'background');
  const detail = request('detail', 'background');
  assert.equal(request('detail', 'interactive'), detail);
  release();
  await Promise.all([active, background, detail]);
  assert.deepEqual(calls, ['active', 'detail', 'background']);
});
