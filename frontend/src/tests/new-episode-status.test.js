import test from 'node:test';
import assert from 'node:assert/strict';
import { reopenForNewEpisodes } from '../domain/new-episode-status.js';

const now = Date.parse('2026-10-11T12:00:00Z');
const title = { id: 'anime', category: 'Anime', format: 'TV' };
const entry = {
  status: 'Completado',
  progress: 12,
  score: 9,
  notes: 'Conservar',
  startDate: '2025-01-01',
  finishDate: '2025-03-30',
  favorite: true,
};
const episode = { episode: 13, date: '2026-10-10T12:00:00Z' };

test('un episodio nuevo emitido pasa a pendiente sin borrar el seguimiento', () => {
  const library = { anime: entry };
  const updated = reopenForNewEpisodes(library, { title, episodes: [episode] }, now);
  assert.deepEqual(updated.anime, { ...entry, status: 'Pendiente' });
  assert.equal(library.anime.status, 'Completado');
  assert.equal(reopenForNewEpisodes(updated, { title, episodes: [episode] }, now), updated);
});

test('temporada nueva de una serie conserva los capítulos de temporadas anteriores', () => {
  const series = {
    id: 'series',
    category: 'Series',
    format: 'Serie',
    seasons: [
      { number: 7, total: 6 },
      { number: 8, total: 6 },
    ],
  };
  const library = { series: { ...entry, progress: 6, seasonProgress: { 7: 6 } } };
  const updated = reopenForNewEpisodes(
    library,
    { title: series, episodes: [{ ...episode, season: 8, episode: 1 }] },
    now,
  );
  assert.equal(updated.series.status, 'Pendiente');
  assert.deepEqual(updated.series.seasonProgress, { 7: 6 });
  assert.equal(updated.series.progress, 6);
  assert.equal(
    reopenForNewEpisodes(
      library,
      { title: series, episodes: [{ ...episode, season: 7, episode: 6 }] },
      now,
    ),
    library,
  );
});

test('no cambia por anuncios, episodios futuros, ya vistos, películas o estados distintos', () => {
  const library = { anime: entry };
  for (const episodes of [
    [],
    [{ ...episode, episode: 12 }],
    [{ ...episode, date: '2099-01-01' }],
    [{ ...episode, date: 'invalid' }],
  ])
    assert.equal(
      reopenForNewEpisodes(library, { title, episodes, related: [title] }, now),
      library,
    );
  for (const status of ['Viendo', 'Pausado', 'Abandonado', 'Pendiente']) {
    const current = { anime: { ...entry, status } };
    assert.equal(reopenForNewEpisodes(current, { title, episodes: [episode] }, now), current);
  }
  assert.equal(
    reopenForNewEpisodes(
      library,
      { title: { ...title, format: 'Película' }, episodes: [episode] },
      now,
    ),
    library,
  );
  const removed = {};
  assert.equal(reopenForNewEpisodes(removed, { title, episodes: [episode] }, now), removed);
});
