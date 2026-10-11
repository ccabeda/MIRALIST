import test from 'node:test';
import assert from 'node:assert/strict';
import { sortFolders } from '../domain/folder-sorting.js';
import { parseSectionPreferences } from '../domain/library-preferences.js';

const folders = [
  { name: 'Saga 10', titleIds: ['a'] },
  { name: 'Ánimes', titleIds: ['a', 'b'] },
  { name: 'Saga 2', titleIds: [] },
];
const names = (order) => sortFolders(folders, order).map((folder) => folder.name);

test('carpetas: orden natural por nombre, cantidad y alta sin cambiar su contenido', () => {
  assert.deepEqual(names('name'), ['Ánimes', 'Saga 2', 'Saga 10']);
  assert.deepEqual(names('name-desc'), ['Saga 10', 'Saga 2', 'Ánimes']);
  assert.deepEqual(names('most'), ['Ánimes', 'Saga 10', 'Saga 2']);
  assert.deepEqual(names('least'), ['Saga 2', 'Saga 10', 'Ánimes']);
  assert.deepEqual(names('recent'), ['Saga 2', 'Ánimes', 'Saga 10']);
  assert.deepEqual(names('original'), ['Saga 10', 'Ánimes', 'Saga 2']);
  assert.deepEqual(folders[1].titleIds, ['a', 'b']);
});

test('cada biblioteca recuerda su orden de carpetas independientemente del orden de obras', () => {
  const preferences = parseSectionPreferences(
    JSON.stringify({
      sections: {
        anime: { folderOrder: 'name', order: 'score' },
        screen: { folderOrder: 'most', order: 'title' },
      },
    }),
  );
  assert.equal(preferences.sections.anime.folderOrder, 'name');
  assert.equal(preferences.sections.anime.order, 'score');
  assert.equal(preferences.sections.screen.folderOrder, 'most');
  assert.deepEqual(parseSectionPreferences(JSON.stringify(preferences)), preferences);
  assert.equal(
    parseSectionPreferences('{"folderOrder":"bad"}').sections.anime.folderOrder,
    'original',
  );
});
