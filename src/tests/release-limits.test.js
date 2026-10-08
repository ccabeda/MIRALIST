import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseLimits, seasonReleaseMax } from '../domain/release-limits.js';
import { applyEntryPatch } from '../domain/entry-updates.js';
import { bulkStatus } from '../domain/bulk-actions.js';
import { withReleaseProgress } from '../services/catalog/release-progress.js';

const title = { id: 'test', category: 'Anime', format: 'TV', total: 12 };
const entry = { status: 'Pendiente', progress: 0, score: 0, notes: 'Conservar' };

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
