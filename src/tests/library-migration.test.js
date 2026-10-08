import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSavedLibrary } from '../services/library-migration.js';
import { storageKeys } from '../services/storage.js';
import { readBackup } from '../domain/backup.js';

const entry = { status: 'Viendo', progress: 3, score: 7, notes: 'Conservar en copia' };
function setup() {
  const values = new Map([
    [
      storageKeys.library,
      JSON.stringify({
        frieren: entry,
        dragonball: {
          ...entry,
          catalog: { id: 'dragonball', title: 'Dragon Ball', providerIds: { mal: 223 } },
        },
        'mal-21': {
          ...entry,
          catalog: { id: 'mal-21', title: 'One Piece', providerIds: { mal: 21 } },
        },
      }),
    ],
    [
      storageKeys.folders,
      JSON.stringify([{ id: 'folder', name: 'Mi carpeta', titleIds: ['frieren', 'mal-21'] }]),
    ],
  ]);
  return {
    values,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
}
test('retira ejemplos persistidos, conserva obras API y deja una copia importable con carpetas', () => {
  const { values, storage } = setup();
  const result = loadSavedLibrary([], storage);
  assert.deepEqual(Object.keys(result), ['dragonball', 'mal-21']);
  assert.equal(result['mal-21'].notes, entry.notes);
  const backup = readBackup(values.get(storageKeys.demoBackup), []);
  assert.equal(backup.library.frieren.notes, entry.notes);
  assert.deepEqual(backup.folders[0].titleIds, ['frieren', 'mal-21']);
  assert.deepEqual(loadSavedLibrary([], storage), result);
  // A deliberate later restoration must not be removed on every reload.
  values.set(storageKeys.library, JSON.stringify(backup.library));
  assert.ok(loadSavedLibrary([], storage).frieren);
});
test('si no puede guardar la copia no retira ninguna obra', () => {
  const { storage } = setup();
  storage.setItem = () => {
    throw new Error('Storage full');
  };
  assert.equal(Object.keys(loadSavedLibrary([], storage)).length, 3);
});
