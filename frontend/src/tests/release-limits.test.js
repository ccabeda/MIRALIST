import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseLimits, seasonReleaseMax } from '../domain/release-limits.js';
import { applyEntryPatch } from '../domain/entry-updates.js';
import { bulkStatus } from '../domain/bulk-actions.js';
import { withReleaseProgress } from '../services/catalog/release-progress.js';
import { updateSeason } from '../domain/seasons.js';

const title = { id: 'test', category: 'Anime', format: 'TV', total: 12 };
const entry = { status: 'Pendiente', progress: 0, score: 0, notes: 'Conservar' };

test('Black Mirror permite el sexto capítulo de temporada 7 aunque la serie pueda continuar', () => {
  const series = {
    ...title,
    category: 'Series',
    total: 33,
    seasons: [3, 4, 6, 6, 3, 5, 6].map((total, index) => ({ number: index + 1, total })),
    metadata: {
      status: 'En emisión',
      lastEpisodeSeason: 7,
      lastEpisodeNumber: 6,
      lastEpisodeDate: '2025-04-10',
    },
  };
  const previous = {
    ...entry,
    status: 'Viendo',
    progress: 32,
    seasonProgress: { 1: 3, 2: 4, 3: 6, 4: 6, 5: 3, 6: 5, 7: 5 },
  };
  const change = updateSeason(series, previous, 7, 6);
  const saved = applyEntryPatch(series, previous, {
    progress: change.progress,
    seasonProgress: change.seasonProgress,
  });
  assert.equal(saved.progress, 33);
  assert.equal(saved.seasonProgress[7], 6);
  assert.equal(saved.status, 'Completado');
  assert.equal(applyEntryPatch(series, previous, { status: 'Completado' }).progress, 33);
  const future = { ...series, total: 39, seasons: [...series.seasons, { number: 8, total: 6 }] };
  assert.equal(seasonReleaseMax(future, future.seasons[7]), 0);
  assert.equal(releaseLimits(future).statuses.includes('Completado'), false);
  const unknown = { ...series, metadata: { status: 'En emisión' } };
  assert.equal(releaseLimits(unknown).statuses.includes('Completado'), false);
});

test('sin estreno solo admite Pendiente, incluso desde acciones en grupo', () => {
  const upcoming = { ...title, metadata: { status: 'Próximamente' } };
  assert.deepEqual(releaseLimits(upcoming).statuses, ['Pendiente']);
  for (const status of ['Viendo', 'Completado', 'Pausado', 'Abandonado']) {
    assert.equal(applyEntryPatch(upcoming, entry, { status }), entry);
    assert.equal(bulkStatus({ test: entry }, [upcoming], ['test'], status).test, entry);
  }
  assert.equal(applyEntryPatch(upcoming, entry, { progress: 3 }).progress, 0);
  assert.equal(applyEntryPatch(upcoming, entry, { favorite: true }).favorite, true);
  assert.equal(releaseLimits({ ...title, metadata: { startDate: '2099-01-01' } }).max, 0);
});

test('dos emitidos no permiten tres vistos ni completar la temporada', () => {
  const ongoing = { ...title, metadata: { status: 'En emisión', airedEpisodes: 2 } };
  const next = applyEntryPatch(ongoing, entry, { progress: 3 });
  assert.equal(next.progress, 2);
  assert.equal(next.status, 'Viendo');
  assert.equal(applyEntryPatch(ongoing, next, { status: 'Completado' }), next);
  assert.equal(applyEntryPatch(ongoing, next, { progress: 1 }).progress, 1);
  const finished = { ...ongoing, metadata: { status: 'Finalizado', airedEpisodes: 2 } };
  assert.equal(applyEntryPatch(finished, next, { status: 'Completado' }).progress, 12);
});

test('series limitan por temporada y conservan los capítulos anteriores', () => {
  const series = {
    ...title,
    category: 'Series',
    total: 20,
    seasons: [
      { number: 1, total: 10 },
      { number: 2, total: 10 },
    ],
    metadata: { status: 'En emisión', lastEpisodeSeason: 2, lastEpisodeNumber: 2 },
  };
  assert.equal(releaseLimits(series).max, 12);
  assert.equal(seasonReleaseMax(series, series.seasons[1]), 2);
  const next = applyEntryPatch(series, entry, {
    progress: 20,
    seasonProgress: { 1: 10, 2: 10 },
  });
  assert.equal(next.progress, 12);
  assert.deepEqual(next.seasonProgress, { 1: 10, 2: 2 });
  assert.equal(next.status, 'Viendo');
});

test('calendario cuenta emisiones confirmadas y no estrena por una fecha programada', async () => {
  const ongoing = { ...title, providerIds: { mal: 987654321 }, metadata: { status: 'En emisión' } };
  const enriched = await withReleaseProgress(ongoing, {
    force: true,
    fetcher: async () =>
      Response.json({
        recent: [{ episode: 2, date: '2020-01-01T12:00:00Z' }],
        next: { episode: 3, date: '2099-01-01T12:00:00Z' },
      }),
  });
  assert.equal(releaseLimits(enriched).max, 2);
  const unknown = await withReleaseProgress(ongoing, {
    force: true,
    fetcher: async () => Response.json({ recent: [] }),
  });
  assert.equal(releaseLimits(unknown).confirmed, false);
  assert.equal(
    (await withReleaseProgress({ ...title, metadata: { status: 'Finalizado' } })).metadata
      .airedEpisodes,
    undefined,
  );
});
