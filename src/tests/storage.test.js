import test from 'node:test';
import assert from 'node:assert/strict';
import { readStorage, writeStorage, storageKeys } from '../services/storage.js';
import { parseLibrary } from '../domain/library.js';
import { parseFolders } from '../domain/folders.js';
import { parsePreferences } from '../domain/library-preferences.js';

test('storage preserves existing library, folders and preferences keys', () => {
  const values = new Map([
    [
      'miralist.demo.library.v1',
      JSON.stringify({
        frieren: {
          status: 'Viendo',
          progress: 12,
          score: 3,
          favorite: true,
          notes: 'Personal',
          startDate: '2026-01-10',
        },
      }),
    ],
    [
      'miralist.demo.folders.v1',
      JSON.stringify([{ id: 'one', name: 'Favoritos', titleIds: ['frieren'] }]),
    ],
    ['miralist.library.preferences.v1', JSON.stringify({ query: 'frieren', order: 'score' })],
    ['miralist.theme', 'light'],
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const library = parseLibrary(readStorage(storageKeys.library, storage), {});
  assert.equal(library.frieren.notes, 'Personal');
  assert.equal(library.frieren.score, 3);
  assert.equal(library.frieren.startDate, '2026-01-10');
  assert.deepEqual(parseFolders(readStorage(storageKeys.folders, storage), library)[0].titleIds, [
    'frieren',
  ]);
  assert.equal(parsePreferences(readStorage(storageKeys.preferences, storage)).order, 'score');
  assert.equal(readStorage(storageKeys.theme, storage), 'light');
  assert.equal(writeStorage(storageKeys.library, JSON.stringify(library), storage), true);
  assert.equal(values.size, 4);
  assert.deepEqual(JSON.parse(values.get('miralist.demo.library.v1')), library);
});

test('storage failure is reported without crashing the interface', () => {
  const denied = {
    getItem() {
      throw new Error('Access denied');
    },
    setItem() {
      throw new Error('Quota exceeded');
    },
  };
  assert.equal(readStorage(storageKeys.library, denied), null);
  assert.equal(writeStorage(storageKeys.library, '{}', denied), false);
});
