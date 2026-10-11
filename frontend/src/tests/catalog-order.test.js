import test from 'node:test';
import assert from 'node:assert/strict';
import { orderCatalog } from '../domain/catalog-order.js';

const items = [
  { id: 'unknown', year: null },
  { id: 'movie', category: 'Películas', metadata: { startDate: '2026-06-01' } },
  { id: 'anime', category: 'Anime', metadata: { startDate: '2026-02-01' } },
  { id: 'series', category: 'Series', year: 2025 },
  { id: 'invalid', metadata: { startDate: 'bad' } },
];
test('estreno ordena por día y año, dejando fechas desconocidas al final en ambos sentidos', () => {
  assert.deepEqual(
    orderCatalog(items, 'newest').map((t) => t.id),
    ['movie', 'anime', 'series', 'unknown', 'invalid'],
  );
  assert.deepEqual(
    orderCatalog(items, 'oldest').map((t) => t.id),
    ['series', 'anime', 'movie', 'unknown', 'invalid'],
  );
  assert.equal(items[0].id, 'unknown');
  assert.equal(orderCatalog(items, 'relevance'), items);
});
test('fechas iguales conservan el orden original y próximas obras usan su estreno anunciado', () => {
  const same = [
    { id: 'one', year: 2020 },
    { id: 'two', year: 2020 },
  ];
  assert.deepEqual(orderCatalog(same, 'newest'), same);
  assert.equal(orderCatalog([...same, { id: 'future', year: 2030 }], 'newest')[0].id, 'future');
});
