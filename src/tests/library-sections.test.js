import test from 'node:test';
import assert from 'node:assert/strict';
import { belongsToSection, sectionFolders } from '../domain/library-sections.js';
import { parsePreferences } from '../domain/library-preferences.js';

test('anime includes movies and OVAs while screen contains TV and movies', () => {
  for (const format of ['TV', 'Película', 'OVA', 'ONA']) {
    assert.equal(belongsToSection({ category: 'Anime', format }, 'anime'), true);
    assert.equal(belongsToSection({ category: 'Anime', format }, 'screen'), false);
  }
  for (const category of ['Series', 'Películas']) {
    assert.equal(belongsToSection({ category }, 'screen'), true);
    assert.equal(belongsToSection({ category }, 'anime'), false);
  }
});

test('mixed folders keep original IDs and order while each view has accurate counts', () => {
  const folders = [
    { id: 'mixed', titleIds: ['a', 'tv', 'b'] },
    { id: 'screen', titleIds: ['tv'] },
    { id: 'empty', titleIds: [] },
  ];
  assert.deepEqual(sectionFolders(folders, [{ id: 'a' }, { id: 'b' }]), [
    { id: 'mixed', titleIds: ['a', 'b'] },
    { id: 'empty', titleIds: [] },
  ]);
  assert.deepEqual(folders[0].titleIds, ['a', 'tv', 'b']);
  assert.deepEqual(sectionFolders(folders, [{ id: 'tv' }])[0].titleIds, ['tv']);
});

test('library choice persists and invalid choices fall back to anime', () => {
  assert.equal(parsePreferences('{"section":"screen"}').section, 'screen');
  assert.equal(parsePreferences('{"section":"invalid"}').section, 'anime');
});
