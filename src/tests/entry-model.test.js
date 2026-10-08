import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEntryPatch } from '../domain/entry-updates.js';
import { normalizeEntry } from '../domain/entry-validation.js';
import { buildCatalog, normalizeTitle } from '../domain/catalog.js';
import { parseLibrary } from '../domain/library.js';
import { makeBackup, readBackup } from '../domain/backup.js';
import { bulkStatus } from '../domain/bulk-actions.js';

const entry = { status: 'Viendo', progress: 3, score: 3, favorite: true, notes: 'Conservar' };
const title = { id: 'test', title: 'Una serie', category: 'Anime', format: 'TV', total: 12 };

test('editor, tarjetas y acciones en grupo comparten las reglas de progreso', () => {
  const completed = applyEntryPatch(title, entry, { progress: 99 });
  assert.equal(completed.progress, 12);
  assert.equal(completed.status, 'Completado');
  assert.deepEqual(completed, bulkStatus({ test: entry }, [title], ['test'], 'Completado').test);
  assert.equal(applyEntryPatch(title, completed, { progress: 11 }).status, 'Viendo');
  assert.equal(applyEntryPatch(title, completed, { status: 'Pendiente' }).progress, 0);
  assert.equal(completed.notes, entry.notes);
});

test('un total desconocido admite progreso y finalización manual sin inventar capítulos', () => {
  const unknown = { ...title, total: null };
  const next = applyEntryPatch(unknown, entry, { progress: 100 });
  assert.equal(next.status, 'Viendo');
  assert.equal(next.progress, 100);
  const completed = applyEntryPatch(unknown, next, { status: 'Completado' });
  assert.equal(completed.progress, 100);
  assert.equal(normalizeEntry(completed, unknown).status, 'Completado');
  const movie = { ...unknown, format: 'Película' };
  assert.equal(
    applyEntryPatch(movie, { ...entry, progress: 0 }, { status: 'Completado' }).progress,
    1,
  );
  assert.throws(() => normalizeEntry(entry, movie));
});

test('cambiar el estado redistribuye temporadas y conserva notas', () => {
  const series = {
    ...title,
    category: 'Series',
    seasons: [
      { number: 1, total: 5 },
      { number: 2, total: 7 },
    ],
  };
  const completed = applyEntryPatch(series, entry, { status: 'Completado' });
  assert.deepEqual(completed.seasonProgress, { 1: 5, 2: 7 });
  assert.deepEqual(applyEntryPatch(series, completed, { status: 'Pendiente' }).seasonProgress, {
    1: 0,
    2: 0,
  });
});

test('copias y recarga conservan obras que no están en el catálogo actual', () => {
  const savedTitle = normalizeTitle({ ...title, total: null, providerIds: { anilist: 123 } });
  const library = { test: { ...entry, catalog: savedTitle, startDate: '2026-10-01' } };
  const folders = [{ id: 'folder', name: 'Mis series', titleIds: ['test'] }];
  const restored = readBackup(JSON.stringify(makeBackup(library, folders, [])), []);
  const reloaded = parseLibrary(JSON.stringify(restored.library), {}, []);
  assert.deepEqual(buildCatalog([], reloaded), [savedTitle]);
  assert.equal(reloaded.test.notes, entry.notes);
  assert.equal(reloaded.test.score, 3);
  assert.equal(reloaded.test.startDate, '2026-10-01');
  assert.deepEqual(restored.folders, folders);
  assert.equal(buildCatalog([title], reloaded)[0], title);
  assert.equal(buildCatalog([], { legacy: entry })[0].id, 'legacy');
});

test('recuperación e importación rechazan los mismos valores de seguimiento inválidos', () => {
  for (const patch of [
    { progress: -1 },
    { progress: 13 },
    { score: 11 },
    { favorite: 'sí' },
    { seasonProgress: { 1: 1 } },
  ]) {
    const library = { test: { ...entry, ...patch } };
    assert.deepEqual(parseLibrary(JSON.stringify(library), {}, [title]), {});
    assert.throws(() => readBackup(JSON.stringify(makeBackup(library, [], [title])), [title]));
  }
  const dated = { test: { ...entry, startDate: '2026-02-30' } };
  assert.equal(parseLibrary(JSON.stringify(dated), {}, [title]).test.startDate, '');
  assert.throws(() => readBackup(JSON.stringify(makeBackup(dated, [], [title])), [title]));
});
