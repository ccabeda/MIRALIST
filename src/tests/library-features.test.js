import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localToday,
  dateSuggestion,
  migrateMovieDates,
  suggestTitleDate,
} from '../domain/watch-dates.js';
import { seasonProgress, updateSeason, seasonsFor } from '../domain/seasons.js';
import { pendingTitles, choosePending } from '../domain/random-pick.js';
import { libraryStats } from '../domain/statistics.js';
import { makeBackup, readBackup } from '../domain/backup.js';
import { titles, initialLibrary } from './fixtures/catalog.js';
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
