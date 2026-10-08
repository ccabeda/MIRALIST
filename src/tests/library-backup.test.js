import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBackup, readBackup, mergeBackup } from '../domain/backup.js';
import { titles, initialLibrary } from './fixtures/catalog.js';

test('importación remapea alias a una sola ficha y conserva el orden de carpetas', () => {
  const title = titles.find((t) => t.id === 'yourname');
  const entry = {
    status: 'Pendiente',
    progress: 0,
    score: 3,
    favorite: true,
    notes: 'Primera ficha',
  };
  const copy = makeBackup(
    { yourname: entry, translated: { ...entry, score: 7 } },
    [{ id: 'f', name: 'Anime', titleIds: ['translated', 'yourname'] }],
    [title, { ...title, id: 'translated', title: 'Kimi no Na wa.' }],
  );
  const restored = readBackup(JSON.stringify(copy), titles);
  assert.deepEqual(Object.keys(restored.library), ['yourname']);
  assert.equal(restored.library.yourname.score, 3);
  assert.equal(restored.duplicateCount, 1);
  assert.deepEqual(restored.folders[0].titleIds, ['yourname']);
});
test('copia de seguridad conserva datos, notas, medias estrellas y carpetas', () => {
  const library = {
    ...initialLibrary,
    frieren: {
      ...initialLibrary.frieren,
      score: 3,
      notes: 'Una nota con ñ y ★',
      startDate: '2026-01-01',
      finishDate: '',
    },
  };
  const folders = [{ id: 'test', name: 'Favoritas', titleIds: ['frieren', 'bebop'] }];
  const copy = readBackup(JSON.stringify(makeBackup(library, folders)), titles);
  assert.equal(copy.library.frieren.score, 3);
  assert.equal(copy.library.frieren.notes, library.frieren.notes);
  assert.equal(copy.library.frieren.startDate, '2026-01-01');
  assert.deepEqual(copy.folders, folders);
  assert.equal(Object.keys(copy.library).length, 4);
});

test('importación rechaza versión, valores, relaciones huérfanas y claves peligrosas', () => {
  assert.throws(() => readBackup('not json', titles));
  assert.throws(() => readBackup(JSON.stringify({ ...makeBackup({}, []), version: 9 }), titles));
  assert.throws(() =>
    readBackup(
      JSON.stringify(makeBackup({ frieren: { ...initialLibrary.frieren, progress: 500 } }, [])),
      titles,
    ),
  );
  assert.throws(() =>
    readBackup(
      JSON.stringify(makeBackup(initialLibrary, [{ id: 'x', name: 'X', titleIds: ['unknown'] }])),
      titles,
    ),
  );
  assert.throws(() =>
    readBackup('{"app":"MiraList","version":1,"library":{"__proto__":{}},"folders":[]}', titles),
  );
  assert.throws(() =>
    readBackup(
      JSON.stringify(
        makeBackup({ severance: { ...initialLibrary.severance, seasonProgress: { 1: 9 } } }, []),
      ),
      titles,
    ),
  );
});

test('importar combina sin sobrescribir salvo elección explícita', () => {
  const incoming = {
    library: { frieren: { ...initialLibrary.frieren, score: 2 } },
    folders: [{ id: 'a', name: 'Anime', titleIds: ['frieren'] }],
  };
  const currentFolders = [{ id: 'a', name: 'Mi anime', titleIds: ['bebop'] }];
  const kept = mergeBackup(initialLibrary, currentFolders, incoming);
  assert.equal(kept.library.frieren.score, 9);
  assert.equal(kept.library.bebop.score, 10);
  assert.deepEqual(kept.folders[0].titleIds, ['bebop', 'frieren']);
  assert.deepEqual(currentFolders[0].titleIds, ['bebop']);
  assert.equal(
    mergeBackup(initialLibrary, currentFolders, incoming, true).library.frieren.score,
    2,
  );
});
