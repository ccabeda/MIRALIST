import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionRequest } from '../services/collection.js';
import { makeBackup, readBackup, mergeBackup } from '../domain/backup.js';
import { normalizeTitle } from '../domain/catalog.js';

const title = normalizeTitle({
  id: 'mal-1',
  title: 'Anime',
  category: 'Anime',
  format: 'TV',
  total: 12,
  providerIds: { mal: 1 },
});
const entry = {
  status: 'Viendo',
  progress: 2,
  score: 7,
  notes: 'Nota',
  favorite: true,
  startDate: '2026-10-01',
  finishDate: '',
  catalog: title,
};

test('importar una copia remapea duplicados y conserva el seguimiento de la cuenta', () => {
  const translated = { ...title, id: 'old-id', title: 'Nombre japonés' };
  const backup = makeBackup({ 'old-id': { ...entry, catalog: translated } }, [
    { id: 'saga', name: 'Saga', titleIds: ['old-id'] },
  ]);
  const imported = readBackup(JSON.stringify(backup), [title]);
  assert.deepEqual(Object.keys(imported.library), ['mal-1']);
  assert.deepEqual(imported.folders[0].titleIds, ['mal-1']);
  const current = { 'mal-1': { ...entry, progress: 5 } };
  const merged = mergeBackup(current, [], imported, false);
  assert.equal(merged.library['mal-1'].progress, 5);
  assert.equal(merged.folders.length, 1);
  assert.deepEqual(mergeBackup(merged.library, merged.folders, imported, false), merged);
});

test('API de biblioteca conserva campos opcionales y exige la cuenta esperada', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/library');
    assert.equal(options.headers['X-Miralist-User'], 'user-one');
    return Response.json({
      version: 'version-one',
      library: { 'mal-1': { ...entry, addedAt: null, watchedDate: null, seasonProgress: null } },
      folders: [],
    });
  });
  const result = await collectionRequest('user-one');
  assert.equal(result.library['mal-1'].score, 7);
  assert.equal(result.library['mal-1'].notes, 'Nota');
  assert.equal(result.library['mal-1'].addedAt, undefined);
});

test('guardado envía CSRF, revisión y cuenta; informa conflictos sin éxito falso', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === '/api/auth/csrf') return Response.json({ token: 'csrf-test' });
    assert.equal(options.method, 'PUT');
    assert.equal(options.headers['X-CSRF-TOKEN'], 'csrf-test');
    assert.equal(options.headers['X-Miralist-User'], 'user-one');
    assert.equal(JSON.parse(options.body).version, 'old-version');
    return Response.json({ title: 'La biblioteca cambió' }, { status: 409 });
  });
  await assert.rejects(
    collectionRequest('user-one', { library: {}, folders: [], version: 'old-version' }),
    { status: 409, message: 'La biblioteca cambió' },
  );
});
