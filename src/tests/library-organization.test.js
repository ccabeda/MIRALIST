import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFolders,
  validateFolderName,
  addTitleToFolders,
  restoreFolder,
} from '../domain/folders.js';
import { sortTitles } from '../domain/title-sorting.js';
import { bulkStatus, bulkFolders } from '../domain/bulk-actions.js';
import { makeBackup, readBackup } from '../domain/backup.js';
import { titles, initialLibrary } from './fixtures/catalog.js';
import {
  moveTitle,
  sameWork,
  canonicalTitle,
  matchesTitle,
  bulkUndo,
  restoreBulk,
} from '../domain/organization.js';

test('orden de carpeta mueve en ambos sentidos sin perder miembros y persiste en copias', () => {
  const ids = ['frieren', 'bebop', 'dune'];
  assert.deepEqual(moveTitle(ids, 'frieren', 'dune'), ['bebop', 'dune', 'frieren']);
  assert.deepEqual(moveTitle(ids, 'dune', 'frieren'), ['dune', 'frieren', 'bebop']);
  assert.equal(moveTitle(ids, 'missing', 'frieren'), ids);
  const folders = [{ id: 'a', name: 'Orden', titleIds: moveTitle(ids, 'dune', 'frieren') }];
  assert.deepEqual(
    readBackup(JSON.stringify(makeBackup(initialLibrary, folders, titles)), titles).folders[0]
      .titleIds,
    ['dune', 'frieren', 'bebop'],
  );
});

test('alias e identificadores detectan la misma obra sin unir formatos, temporadas o remakes', () => {
  const original = titles.find((t) => t.id === 'yourname');
  const translated = { ...original, id: 'japanese', title: 'Kimi no Na wa', aliases: [] };
  assert.equal(sameWork(original, translated), true);
  assert.equal(canonicalTitle(translated, titles).id, 'yourname');
  assert.equal(matchesTitle(original, '君の名は'), true);
  assert.equal(matchesTitle(original, 'KIMI NO NA WA.'), true);
  assert.equal(sameWork(original, { ...translated, format: 'OVA' }), false);
  assert.equal(sameWork(original, { ...translated, year: 2027 }), false);
  assert.equal(sameWork(original, { ...translated, total: 12 }), false);
  assert.equal(
    sameWork({ ...original, providerIds: { mal: 1 } }, { ...translated, providerIds: { mal: 2 } }),
    false,
  );
  assert.equal(
    sameWork(
      { ...original, providerIds: { mal: 1 } },
      { ...translated, title: 'Other', providerIds: { mal: 1 } },
    ),
    true,
  );
  assert.equal(
    sameWork(
      { ...original, providerIds: { tmdb: 1 } },
      { ...translated, category: 'Series', providerIds: { tmdb: 1 } },
    ),
    false,
  );
});
test('deshacer estado en grupo recupera progreso sin borrar notas o puntuaciones posteriores', () => {
  const next = bulkStatus(initialLibrary, titles, ['frieren', 'severance'], 'Completado');
  const action = bulkUndo(initialLibrary, next, [], [], 'Estado');
  const edited = {
    ...next,
    frieren: { ...next.frieren, notes: 'Nueva nota', score: 2, startDate: '2026-10-07' },
  };
  const restored = restoreBulk(edited, [], action);
  assert.equal(restored.library.frieren.progress, 12);
  assert.equal(restored.library.frieren.status, 'Viendo');
  assert.equal(restored.library.frieren.notes, 'Nueva nota');
  assert.equal(restored.library.frieren.score, 2);
  assert.equal(restored.library.frieren.startDate, '2026-10-07');
  assert.equal(restored.library.severance.seasonProgress, undefined);
  assert.equal(bulkUndo(initialLibrary, initialLibrary, [], [], 'Nada'), null);
  const newer = bulkStatus(next, titles, ['frieren'], 'Pendiente');
  assert.equal(restoreBulk(newer, [], action).library.frieren.status, 'Pendiente');
});

test('deshacer movimiento restaura posiciones y conserva cambios ajenos y nombres', () => {
  const before = [
    { id: 'a', name: 'A', titleIds: ['frieren', 'bebop', 'dune'] },
    { id: 'b', name: 'B', titleIds: [] },
  ];
  const after = bulkFolders(before, ['frieren', 'bebop'], 'b', true);
  const action = bulkUndo(initialLibrary, initialLibrary, before, after, 'Mover');
  const later = after.map((f) =>
    f.id === 'a' ? { ...f, name: 'Renombrada', titleIds: [...f.titleIds, 'severance'] } : f,
  );
  const restored = restoreBulk(initialLibrary, later, action);
  assert.deepEqual(restored.folders[0].titleIds, ['frieren', 'bebop', 'dune', 'severance']);
  assert.equal(restored.folders[0].name, 'Renombrada');
  assert.deepEqual(restored.folders[1].titleIds, []);
  assert.equal(restoreBulk(initialLibrary, [later[1]], action).folders.length, 1);
});
test('acciones en grupo preservan notas y fechas y sincronizan capítulos', () => {
  const source = {
    ...initialLibrary,
    frieren: { ...initialLibrary.frieren, startDate: '2026-01-01', notes: 'Conservar' },
  };
  const next = bulkStatus(source, titles, ['frieren', 'severance', 'missing'], 'Completado');
  assert.equal(next.frieren.progress, 28);
  assert.equal(next.frieren.startDate, '2026-01-01');
  assert.equal(next.frieren.notes, 'Conservar');
  assert.deepEqual(next.severance.seasonProgress, { 1: 9 });
  assert.equal(next.frieren.finishDate, undefined);
  assert.equal(source.frieren.progress, 12);
  assert.equal(bulkStatus(next, titles, ['severance'], 'Pendiente').severance.progress, 0);
  const folders = [
    { id: 'a', titleIds: ['frieren', 'bebop'] },
    { id: 'b', titleIds: [] },
  ];
  assert.deepEqual(bulkFolders(folders, ['frieren'], 'b')[0].titleIds, ['frieren', 'bebop']);
  assert.deepEqual(
    bulkFolders(folders, ['frieren'], 'b', true).map((f) => f.titleIds),
    [['bebop'], ['frieren']],
  );
  assert.deepEqual(bulkFolders(folders, ['frieren'], 'missing', true), folders);
});
test('ordenar usa fecha de alta, puntuación y finalización sin mutar la biblioteca', () => {
  const titles = [
    { id: 'a', title: 'Zeta' },
    { id: 'b', title: 'Alfa' },
    { id: 'c', title: 'Beta' },
  ];
  const library = {
    a: { score: 10, finishDate: '2026-01-01' },
    b: { score: 3 },
    c: { score: 0, addedAt: '2026-10-07T10:00:00Z' },
  };
  assert.deepEqual(
    sortTitles(titles, library, 'recent').map((t) => t.id),
    ['c', 'b', 'a'],
  );
  assert.deepEqual(
    sortTitles(titles, library, 'score').map((t) => t.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    sortTitles(titles, library, 'title').map((t) => t.id),
    ['b', 'c', 'a'],
  );
  assert.equal(sortTitles(titles, library, 'finished')[0].id, 'a');
  assert.equal(titles[0].id, 'a');
});
test('deshacer carpeta conserva nuevas carpetas y evita referencias huérfanas', () => {
  const removed = { id: 'old', name: 'Anime', titleIds: ['a', 'deleted'] };
  const current = [{ id: 'new', name: 'Anime', titleIds: [] }];
  const restored = restoreFolder(current, removed, { a: {} });
  assert.equal(restored[1].name, 'Anime (2)');
  assert.deepEqual(restored[1].titleIds, ['a']);
  assert.equal(restoreFolder(restored, removed, { a: {} }).length, 2);
  assert.deepEqual(current[0].titleIds, []);
});
test('las carpetas conservan pertenencia múltiple y descartan referencias borradas', () => {
  const library = { frieren: { progress: 12 }, bebop: { progress: 26 } };
  const folders = [
    { id: 'a', name: ' Favoritas ', titleIds: ['frieren', 'frieren', 'removed'] },
    { id: 'b', name: 'Para el finde', titleIds: ['frieren', 'bebop'] },
  ];
  const restored = parseFolders(JSON.stringify(folders), library);
  assert.deepEqual(restored[0], { id: 'a', name: 'Favoritas', titleIds: ['frieren'] });
  assert.deepEqual(restored[1].titleIds, ['frieren', 'bebop']);
  assert.deepEqual(library, { frieren: { progress: 12 }, bebop: { progress: 26 } });
  const afterRemoval = parseFolders(JSON.stringify(restored), { bebop: library.bebop });
  assert.deepEqual(afterRemoval[0].titleIds, []);
  assert.deepEqual(afterRemoval[1].titleIds, ['bebop']);
});

test('carpetas: recuperación de datos inválidos, IDs duplicados y nombres únicos', () => {
  assert.deepEqual(parseFolders('not-json', {}), []);
  assert.deepEqual(parseFolders('{}', {}), []);
  assert.deepEqual(parseFolders('[null, {"id":"a","name":"","titleIds":[]}]', {}), []);
  const folders = [{ id: 'a', name: 'Dragon Ball', titleIds: [] }];
  assert.equal(parseFolders(JSON.stringify([...folders, ...folders]), {}).length, 1);
  assert.ok(validateFolderName(' dragon ball ', folders));
  assert.equal(validateFolderName('Dragon Ball', folders, 'a'), '');
  assert.ok(validateFolderName('   ', folders));
  assert.ok(validateFolderName('a'.repeat(61), folders));
  assert.equal(validateFolderName('Películas', folders), '');
});

test('guardar favorito en carpetas es idempotente y preserva otras pertenencias', () => {
  const folders = [
    { id: 'a', name: 'Anime', titleIds: ['frieren'] },
    { id: 'b', name: 'Favoritas', titleIds: ['bebop'] },
    { id: 'c', name: 'Para el finde', titleIds: [] },
  ];
  const updated = addTitleToFolders(folders, 'frieren', ['a', 'b']);
  assert.deepEqual(updated[0].titleIds, ['frieren']);
  assert.deepEqual(updated[1].titleIds, ['bebop', 'frieren']);
  assert.deepEqual(updated[2].titleIds, []);
  assert.deepEqual(folders[1].titleIds, ['bebop']);
  assert.deepEqual(addTitleToFolders(updated, 'frieren', ['a', 'b']), updated);
  assert.deepEqual(addTitleToFolders(updated, 'frieren', []), updated);
});
