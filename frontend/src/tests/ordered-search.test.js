import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderedSearch } from '../services/catalog/ordered-search.js';

const search = { category: 'Anime', query: 'dragon', format: 'Todos', page: 1, order: 'newest' };
const titles = Array.from({ length: 30 }, (_, i) => ({
  id: String(i),
  year: 1990 + i,
  format: i % 2 ? 'TV' : 'OVA',
}));

test('ordena todas las páginas antes de paginar y reutiliza la búsqueda completa', async () => {
  const calls = [];
  const run = createOrderedSearch(async ({ page }) => {
    calls.push(page);
    return { items: page === 1 ? titles.slice(0, 24) : titles.slice(24), hasNext: page === 1 };
  });
  const first = await run(search);
  assert.equal(first.items[0].year, 2019);
  assert.equal(first.items.length, 24);
  assert.equal(first.total, 30);
  const next = await run({ ...search, page: 2 });
  assert.equal(next.items[0].year, 1995);
  assert.equal(next.hasNext, false);
  const oldest = await run({ ...search, order: 'oldest' });
  assert.equal(oldest.items[0].year, 1990);
  const ovas = await run({ ...search, format: 'OVA' });
  assert.equal(ovas.total, 15);
  assert.equal(ovas.hasNext, false);
  assert.deepEqual(calls, [1, 2]);
});

test('un error intermedio no devuelve ni almacena un orden parcial', async () => {
  let fail = true;
  let calls = 0;
  const run = createOrderedSearch(async ({ page }) => {
    calls++;
    if (page === 2 && fail) throw new Error('network');
    return { items: [titles[page]], hasNext: page === 1 };
  });
  await assert.rejects(run(search), /network/);
  fail = false;
  assert.equal((await run(search)).total, 2);
  assert.equal(calls, 4);
});

test('cancela páginas pendientes cuando cambia la búsqueda', async () => {
  let active = true;
  let calls = 0;
  const run = createOrderedSearch(async () => {
    calls++;
    active = false;
    return { items: titles, hasNext: true };
  });
  await assert.rejects(run(search, { isActive: () => active }), /cancelada/);
  assert.equal(calls, 1);
});

test('TMDB rechaza búsquedas que exceden el límite y no las presenta como completas', async () => {
  const run = createOrderedSearch(async () => ({ items: titles, hasNext: true, totalPages: 501 }));
  await assert.rejects(run({ ...search, category: 'Series' }), /más específico/);
});

test('películas deduplicadas usan páginas de 20 y reintentar renueva la caché', async () => {
  let calls = 0;
  const run = createOrderedSearch(async () => {
    calls++;
    return { items: [...titles, titles[0]], hasNext: false };
  });
  const movie = { ...search, category: 'Películas' };
  assert.equal((await run(movie)).items.length, 20);
  assert.equal((await run({ ...movie, page: 2 })).items.length, 10);
  assert.equal(calls, 1);
  assert.equal((await run(movie, { force: true })).total, 30);
  assert.equal(calls, 2);
});
