import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateProgress,
  parseLibrary,
  isMovie,
  validateWatchDates,
  formatStars,
} from '../domain/library.js';
import {
  parseFolders,
  validateFolderName,
  addTitleToFolders,
  restoreFolder,
} from '../domain/folders.js';
import { sortTitles } from '../domain/title-sorting.js';
import {
  localToday,
  dateSuggestion,
  migrateMovieDates,
  suggestTitleDate,
} from '../domain/watch-dates.js';
import { seasonProgress, updateSeason, seasonsFor } from '../domain/seasons.js';
import { bulkStatus, bulkFolders } from '../domain/bulk-actions.js';
import { pendingTitles, choosePending } from '../domain/random-pick.js';
import { libraryStats } from '../domain/statistics.js';
import { makeBackup, readBackup, mergeBackup } from '../domain/backup.js';
import { titles, initialLibrary } from './fixtures/catalog.js';
import {
  moveTitle,
  sameWork,
  canonicalTitle,
  matchesTitle,
  bulkUndo,
  restoreBulk,
} from '../domain/organization.js';
import { monthCells, shiftDay, shiftMonth, dateAllowed, displayDate } from '../domain/calendar.js';
import { parsePreferences, defaultPreferences } from '../domain/library-preferences.js';
import {
  personalRecommendations,
  relatedTitles,
  similarTitles,
} from '../domain/recommendations.js';

test('preferencias: recupera filtros y rechaza datos dañados', () => {
  assert.deepEqual(parsePreferences('invalid'), defaultPreferences);
  const prefs = {
    ...defaultPreferences,
    query: 'dragon',
    order: 'score',
    category: 'Anime',
    status: 'Completado',
    favoritesOnly: true,
  };
  assert.deepEqual(parsePreferences(JSON.stringify(prefs)), prefs);
  const invalid = parsePreferences(
    JSON.stringify({ order: 'bad', status: 'bad', category: [], favoritesOnly: 'false' }),
  );
  assert.deepEqual(invalid, defaultPreferences);
});

test('recomendaciones: prioriza la saga y excluye obras completadas', () => {
  const library = { dragonball: { status: 'Completado' }, bebop: { status: 'Completado' } };
  const result = personalRecommendations(titles, library);
  assert.equal(result[0].title.id, 'dragonballsuper');
  assert.equal(result[0].seed.id, 'dragonball');
  assert.ok(result.every((item) => !['dragonball', 'bebop'].includes(item.title.id)));
  const dragon = titles.find((item) => item.id === 'dragonball');
  assert.ok(relatedTitles(dragon, titles).some((item) => item.id === 'dragonballsuper'));
  assert.ok(
    similarTitles(dragon, titles).every(
      (item) => item.id !== 'dragonballsuper' && item.id !== 'dragonball',
    ),
  );
  assert.deepEqual(personalRecommendations(titles, {}), []);
});

test('calendario propio: semanas desde lunes, bisiestos y cambio de año', () => {
  const february = monthCells('2024-02');
  assert.equal(february[0].iso, '2024-01-29');
  assert.equal(february.filter((day) => day.inMonth).length, 29);
  assert.equal(monthCells('2025-02').filter((day) => day.inMonth).length, 28);
  assert.equal(shiftDay('2024-02-28', 1), '2024-02-29');
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(dateAllowed('2026-10-01', '2026-10-02'), false);
  assert.equal(dateAllowed('2026-10-03', undefined, '2026-10-02'), false);
  assert.equal(dateAllowed('2026-10-02', '2026-10-02', '2026-10-02'), true);
  assert.equal(displayDate('2026-10-07'), '7 octubre 2026');
});

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

test('importación remapea alias a una sola ficha y conserva el orden de carpetas', () => {
  const title = titles.find((t) => t.id === 'yourname');
  const entry = {
    status: 'Pendiente',
    progress: 0,
    score: 3,
    favorite: true,
    notes: 'Primera ficha',
  };
  const copy = makeBackup(
    { yourname: entry, translated: { ...entry, score: 7 } },
    [{ id: 'f', name: 'Anime', titleIds: ['translated', 'yourname'] }],
    [title, { ...title, id: 'translated', title: 'Kimi no Na wa.' }],
  );
  const restored = readBackup(JSON.stringify(copy), titles);
  assert.deepEqual(Object.keys(restored.library), ['yourname']);
  assert.equal(restored.library.yourname.score, 3);
  assert.equal(restored.duplicateCount, 1);
  assert.deepEqual(restored.folders[0].titleIds, ['yourname']);
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

test('copia de seguridad conserva datos, notas, medias estrellas y carpetas', () => {
  const library = {
    ...initialLibrary,
    frieren: {
      ...initialLibrary.frieren,
      score: 3,
      notes: 'Una nota con ñ y ★',
      startDate: '2026-01-01',
      finishDate: '',
    },
  };
  const folders = [{ id: 'test', name: 'Favoritas', titleIds: ['frieren', 'bebop'] }];
  const copy = readBackup(JSON.stringify(makeBackup(library, folders)), titles);
  assert.equal(copy.library.frieren.score, 3);
  assert.equal(copy.library.frieren.notes, library.frieren.notes);
  assert.equal(copy.library.frieren.startDate, '2026-01-01');
  assert.deepEqual(copy.folders, folders);
  assert.equal(Object.keys(copy.library).length, 4);
});

test('importación rechaza versión, valores, relaciones huérfanas y claves peligrosas', () => {
  assert.throws(() => readBackup('not json', titles));
  assert.throws(() => readBackup(JSON.stringify({ ...makeBackup({}, []), version: 9 }), titles));
  assert.throws(() =>
    readBackup(
      JSON.stringify(makeBackup({ frieren: { ...initialLibrary.frieren, progress: 500 } }, [])),
      titles,
    ),
  );
  assert.throws(() =>
    readBackup(
      JSON.stringify(makeBackup(initialLibrary, [{ id: 'x', name: 'X', titleIds: ['unknown'] }])),
      titles,
    ),
  );
  assert.throws(() =>
    readBackup('{"app":"MiraList","version":1,"library":{"__proto__":{}},"folders":[]}', titles),
  );
  assert.throws(() =>
    readBackup(
      JSON.stringify(
        makeBackup({ severance: { ...initialLibrary.severance, seasonProgress: { 1: 9 } } }, []),
      ),
      titles,
    ),
  );
});

test('importar combina sin sobrescribir salvo elección explícita', () => {
  const incoming = {
    library: { frieren: { ...initialLibrary.frieren, score: 2 } },
    folders: [{ id: 'a', name: 'Anime', titleIds: ['frieren'] }],
  };
  const currentFolders = [{ id: 'a', name: 'Mi anime', titleIds: ['bebop'] }];
  const kept = mergeBackup(initialLibrary, currentFolders, incoming);
  assert.equal(kept.library.frieren.score, 9);
  assert.equal(kept.library.bebop.score, 10);
  assert.deepEqual(kept.folders[0].titleIds, ['bebop', 'frieren']);
  assert.deepEqual(currentFolders[0].titleIds, ['bebop']);
  assert.equal(
    mergeBackup(initialLibrary, currentFolders, incoming, true).library.frieren.score,
    2,
  );
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

test('azar toma solo pendientes y evita repetir si hay alternativas', () => {
  const library = {
    ...initialLibrary,
    frieren: { ...initialLibrary.frieren, status: 'Pendiente' },
  };
  assert.deepEqual(
    pendingTitles(titles, library, 'Anime', 'Fantasía').map((t) => t.id),
    ['frieren'],
  );
  const pool = pendingTitles(titles, library);
  assert.equal(choosePending(pool, 'dune', () => 0).id, 'frieren');
  assert.equal(choosePending([], null), null);
  assert.equal(
    choosePending([titles.find((title) => title.id === 'frieren')], 'frieren').id,
    'frieren',
  );
});

test('estadísticas usan finalización de series y visionado de películas sin fechas por capítulo', () => {
  const library = {
    ...initialLibrary,
    frieren: {
      ...initialLibrary.frieren,
      status: 'Completado',
      progress: 28,
      finishDate: '2026-10-07',
    },
    dune: {
      ...initialLibrary.dune,
      status: 'Completado',
      progress: 1,
      score: 4,
      watchedDate: '2026-10-07',
    },
  };
  const monthly = libraryStats(titles, library, '2026-10');
  assert.equal(monthly.chapters, 28);
  assert.equal(monthly.completed, 1);
  assert.equal(monthly.movies, 1);
  assert.equal(monthly.average, 3.25);
  assert.equal(monthly.undated, 1);
  assert.equal(libraryStats(titles, library, '2025').chapters, 0);
  assert.equal(libraryStats(titles, library, '2025').average, null);
  assert.equal(libraryStats(titles, library, '2025').movies, 0);
  assert.equal(libraryStats(titles, library).chapters, 58);
});

test('películas usan una fecha, migran la anterior y conservan la fecha en copias', () => {
  const movie = titles.find((t) => t.id === 'dune');
  const entry = {
    ...initialLibrary.dune,
    finishDate: '2026-09-01',
    status: 'Completado',
    progress: 1,
  };
  assert.equal(migrateMovieDates({ dune: entry }, titles).dune.watchedDate, '2026-09-01');
  assert.equal(
    migrateMovieDates({ dune: { ...entry, watchedDate: '' } }, titles).dune.watchedDate,
    '',
  );
  assert.equal(suggestTitleDate(movie, entry, { ...entry, status: 'Viendo' }), null);
  assert.deepEqual(suggestTitleDate(movie, initialLibrary.dune, entry, '2026-10-07'), {
    field: 'watchedDate',
    date: '2026-10-07',
  });
  const dated = { ...entry, watchedDate: '2026-10-02' };
  assert.equal(
    readBackup(JSON.stringify(makeBackup({ dune: dated }, [])), titles).library.dune.watchedDate,
    '2026-10-02',
  );
  assert.throws(() =>
    readBackup(
      JSON.stringify(makeBackup({ dune: { ...dated, watchedDate: '2026-02-30' } }, [])),
      titles,
    ),
  );
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

test('sugerencias son opcionales, no sobrescriben fechas y respetan cronología', () => {
  assert.equal(localToday(new Date(2026, 9, 7, 23, 55)), '2026-10-07');
  const previous = { status: 'Pendiente' };
  assert.deepEqual(dateSuggestion(previous, { status: 'Viendo' }, '2026-10-07'), {
    field: 'startDate',
    date: '2026-10-07',
  });
  assert.equal(dateSuggestion(previous, { status: 'Viendo', startDate: '2026-01-01' }), null);
  assert.equal(
    dateSuggestion(previous, { status: 'Completado', startDate: '2026-12-01' }, '2026-10-07'),
    null,
  );
  assert.equal(dateSuggestion({ status: 'Viendo' }, { status: 'Viendo' }), null);
});

test('temporadas migran progreso anterior y mantienen conteos independientes', () => {
  const title = {
    category: 'Series',
    total: 19,
    seasons: [
      { number: 1, total: 9 },
      { number: 2, total: 10 },
    ],
  };
  const old = { progress: 12, status: 'Viendo', score: 7, startDate: '2026-01-01' };
  assert.deepEqual(seasonProgress(title, old), { 1: 9, 2: 3 });
  const next = updateSeason(title, old, 2, 99);
  assert.equal(next.progress, 19);
  assert.equal(next.status, 'Completado');
  assert.equal(next.startDate, old.startDate);
  assert.equal(updateSeason(title, next, 1, 5).progress, 15);
  assert.deepEqual(seasonsFor({ ...title, category: 'Anime' }), []);
  assert.equal(updateSeason(title, old, 8, 2), old);
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
test('completar y retroceder progreso mantiene estados coherentes', () => {
  const completed = updateProgress({ progress: 11, status: 'Viendo', score: 9 }, 1, 12);
  assert.equal(completed.status, 'Completado');
  assert.equal(completed.score, 9);
  assert.equal(updateProgress(completed, 1, 12).progress, 12);
  assert.equal(updateProgress(completed, -1, 12).status, 'Viendo');
  assert.equal(updateProgress({ progress: 0 }, -1, 12).progress, 0);
});
test('recuperación segura de almacenamiento inválido y biblioteca vacía', () => {
  assert.deepEqual(parseLibrary('invalid', { demo: true }), { demo: true });
  assert.deepEqual(parseLibrary('{}', { demo: true }), {});
  assert.deepEqual(parseLibrary('{"bad":{"status":"Viendo","progress":-1}}', {}), {});
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

test('un especial de un capítulo sigue siendo episódico y una película no', () => {
  assert.equal(isMovie({ category: 'Anime', format: 'Especial', total: 1 }), false);
  assert.equal(isMovie({ category: 'Anime', format: 'OVA', total: 1 }), false);
  assert.equal(isMovie({ category: 'Anime', format: 'Película', total: 1 }), true);
  assert.equal(isMovie({ category: 'Series', format: 'Serie', total: 9 }), false);
});

test('fechas opcionales válidas y orden cronológico', () => {
  assert.equal(validateWatchDates('', ''), '');
  assert.equal(validateWatchDates('', '2026-10-07'), '');
  assert.equal(validateWatchDates('2026-10-07', ''), '');
  assert.equal(validateWatchDates('2026-10-07', '2026-10-07'), '');
  assert.ok(validateWatchDates('2026-10-07', '2026-10-06'));
  assert.ok(validateWatchDates('2026-02-30', ''));
  assert.equal(validateWatchDates('2024-02-29', '2024-03-01'), '');
});

test('las entradas antiguas se conservan y las fechas sobreviven al actualizar capítulos', () => {
  const old = { status: 'Viendo', progress: 12, score: 9, favorite: true };
  const restored = parseLibrary(JSON.stringify({ frieren: old }), {});
  assert.deepEqual(restored.frieren, { ...old, startDate: '', finishDate: '' });
  const dated = { ...old, startDate: '2026-10-01', finishDate: '2026-10-07' };
  const next = updateProgress(dated, 16, 28);
  assert.equal(next.startDate, '2026-10-01');
  assert.equal(next.finishDate, '2026-10-07');
  assert.equal(
    parseLibrary(JSON.stringify({ frieren: next }), {}).frieren.finishDate,
    '2026-10-07',
  );
});

test('notas anteriores se expresan como estrellas con incrementos de media', () => {
  assert.equal(formatStars(0), 'Sin puntuar');
  assert.equal(formatStars(1), '½');
  assert.equal(formatStars(2), '1');
  assert.equal(formatStars(3), '1½');
  assert.equal(formatStars(9), '4½');
  assert.equal(formatStars(10), '5');
});
