import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '../domain/catalog.js';
import { mergeCatalog } from '../domain/catalog-registry.js';
import { fromMal } from '../services/catalog/adapters.js';

const saved = fromMal({
  id: 24833,
  title: 'Ansatsu Kyoushitsu',
  alternative_titles: { en: 'Assassination Classroom' },
  media_type: 'tv',
  start_date: '2015-01-10',
  num_episodes: 22,
  synopsis: 'Descripción completa',
  main_picture: { large: 'https://example.test/cover.jpg' },
});
const summary = fromMal({ id: 24833, title: 'Ansatsu Kyoushitsu' });
const library = { [saved.id]: { status: 'Completado', progress: 22, catalog: saved } };

test('abrir relaciones conserva el nombre y formato guardados en bibliotecas y carpetas', () => {
  const incoming = mergeCatalog([], [summary]);
  const catalog = buildCatalog(incoming, library);
  assert.deepEqual(catalog, [saved]);
  assert.equal(catalog[0].title, 'Assassination Classroom');
  assert.equal(catalog[0].format, 'TV');
  assert.equal(catalog[0].cover, saved.cover);
  assert.deepEqual(buildCatalog([], library), catalog);
  assert.equal(incoming[0].format, 'Desconocido');
});

test('una ficha completa actualiza datos sin perder el ID usado por las carpetas', () => {
  const old = { ...saved, id: 'legacy-id' };
  const updated = { ...saved, total: 23, metadata: { ...saved.metadata, detailLevel: 'full' } };
  const result = buildCatalog([updated], { 'legacy-id': { catalog: old } });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'legacy-id');
  assert.equal(result[0].total, 23);
  assert.equal(result[0].title, saved.title);
});

test('un resumen posterior no degrada una ficha completa ni el seguimiento', () => {
  const detailed = { ...saved, metadata: { ...saved.metadata, detailLevel: 'full' } };
  const entry = { ...library[saved.id], catalog: detailed };
  assert.deepEqual(buildCatalog([summary], { [saved.id]: entry }), [detailed]);
  assert.equal(entry.progress, 22);
  assert.equal(entry.status, 'Completado');
});
