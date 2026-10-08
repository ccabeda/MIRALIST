import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverLibrary } from '../domain/library-recovery.js';
import { buildCatalog } from '../domain/catalog.js';

test('una biblioteca nueva o vacía no contiene ejemplos', () => {
  for (const raw of [null, '', '{}', 'invalid']) {
    assert.deepEqual(recoverLibrary(raw), {});
    assert.deepEqual(buildCatalog([], recoverLibrary(raw)), []);
  }
});

test('recupera solo las obras antiguas guardadas sin inventar progreso ni borrar notas', () => {
  const old = { status: 'Viendo', progress: 14, score: 9, favorite: true, notes: 'Mi nota' };
  const library = recoverLibrary(JSON.stringify({ frieren: old }));
  assert.deepEqual(Object.keys(library), ['frieren']);
  for (const [key, value] of Object.entries(old)) assert.equal(library.frieren[key], value);
  assert.equal(library.frieren.catalog.title, 'Frieren');
  assert.equal(library.frieren.catalog.total, null);
  assert.deepEqual(recoverLibrary(JSON.stringify(library)), library);
});

test('la recuperación conserva las fichas reales y las fechas de películas antiguas', () => {
  const catalog = {
    id: 'mal-223',
    title: 'Dragon Ball',
    category: 'Anime',
    format: 'TV',
    providerIds: { mal: 223 },
    total: 153,
    cover: 'https://cdn.myanimelist.net/cover.jpg',
  };
  const entry = { status: 'Completado', progress: 1, score: 8, finishDate: '2026-09-01' };
  const result = recoverLibrary(JSON.stringify({ dune: entry, 'mal-223': { ...entry, catalog } }));
  assert.equal(result.dune.watchedDate, '2026-09-01');
  assert.equal(result['mal-223'].catalog.providerIds.mal, 223);
  assert.equal(result['mal-223'].catalog.cover, catalog.cover);
});
