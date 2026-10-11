import test from 'node:test';
import assert from 'node:assert/strict';
import { readStorage, writeStorage, storageKeys } from '../services/storage.js';
import { parsePreferences } from '../domain/library-preferences.js';

test('storage preserves preferences and theme without an anonymous library', () => {
  const values = new Map([
    ['miralist.library.preferences.v1', JSON.stringify({ query: 'frieren', order: 'score' })],
    ['miralist.theme', 'light'],
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(parsePreferences(readStorage(storageKeys.preferences, storage)).order, 'score');
  assert.equal(readStorage(storageKeys.theme, storage), 'light');
  assert.equal(writeStorage(storageKeys.theme, 'dark', storage), true);
  assert.equal(values.size, 2);
  assert.equal(values.get('miralist.theme'), 'dark');
  assert.equal(storageKeys.library, undefined);
  assert.equal(storageKeys.folders, undefined);
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
  assert.equal(readStorage(storageKeys.theme, denied), null);
  assert.equal(writeStorage(storageKeys.theme, 'dark', denied), false);
});
