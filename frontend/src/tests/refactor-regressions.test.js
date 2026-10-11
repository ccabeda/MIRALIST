import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedJson } from '../services/catalog/http.js';
import { parseSectionPreferences } from '../domain/library-preferences.js';

test('un límite de MAL no bloquea TMDB ni AnimeSchedule en el mismo proxy', async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    return url.includes('/mal?')
      ? new Response('', { status: 429, headers: { 'Retry-After': '60' } })
      : Response.json({ ok: true });
  };
  const base = 'https://provider-isolation.test/api/catalog/';
  await assert.rejects(cachedJson(`${base}mal?id=1`, { fetcher }), { code: 'rate-limit' });
  await assert.rejects(cachedJson(`${base}mal?id=2`, { fetcher }), { code: 'rate-limit' });
  assert.deepEqual(await cachedJson(`${base}tmdb?id=1`, { fetcher }), { ok: true });
  assert.deepEqual(await cachedJson(`${base}schedule?malId=1`, { fetcher }), { ok: true });
  assert.equal(calls.length, 3);
});

test('migra preferencias antiguas a su biblioteca y conserva ambas al recargar', () => {
  const old = {
    section: 'screen',
    query: 'dark',
    category: 'Series',
    order: 'score',
    activeFolderId: 'series',
    view: 'folders',
  };
  const migrated = parseSectionPreferences(JSON.stringify(old));
  assert.equal(migrated.sections.screen.query, 'dark');
  assert.equal(migrated.sections.screen.activeFolderId, 'series');
  assert.equal(migrated.sections.anime.query, '');
  migrated.sections.anime.query = 'dragon';
  migrated.sections.anime.status = 'Viendo';
  migrated.section = 'anime';
  const restored = parseSectionPreferences(JSON.stringify(migrated));
  assert.deepEqual(restored, migrated);
  assert.equal(restored.sections.screen.category, 'Series');
  assert.equal(restored.sections.screen.order, 'score');
});

test('preferencias dañadas no mezclan categorías ni rompen las bibliotecas', () => {
  const parsed = parseSectionPreferences(
    '{"sections":{"anime":{"category":"Series"},"screen":{"order":"invalid"}}}',
  );
  assert.equal(parsed.sections.anime.category, 'Todos');
  assert.equal(parsed.sections.screen.order, 'recent');
  assert.equal(parseSectionPreferences('bad').section, 'anime');
});
