import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarTitles, calendarEvents, groupCalendarEvents } from '../domain/release-calendar.js';
import { upcomingEpisodes } from '../../server/anime-schedule.js';
import { localToday } from '../domain/watch-dates.js';
import { monthCells, shiftMonth } from '../domain/calendar.js';

const anime = {
  id: 'mal-1',
  title: 'Anime',
  category: 'Anime',
  format: 'TV',
  providerIds: { mal: 1 },
};
const tv = { id: 'tmdb-tv-1', title: 'Serie', category: 'Series', providerIds: { tmdb: 1 } };
test('calendario incluye biblioteca en todos los estados y excluye películas y búsquedas', () => {
  const movie = { ...anime, id: 'movie', format: 'Película' };
  assert.deepEqual(
    calendarTitles([anime, tv, movie, { ...anime, id: 'search' }], {
      'mal-1': { status: 'Completado' },
      'tmdb-tv-1': { status: 'Pendiente' },
      movie: {},
    }),
    [anime, tv],
  );
});
test('calendario convierte instantes de anime a día local, conserva fecha TMDB y filtra pasado', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  const date = '2026-10-09T01:00:00Z';
  const events = calendarEvents(
    anime,
    {
      upcoming: [
        { episode: 2, date },
        { episode: 1, date: '2026-10-07T12:00:00Z' },
        { episode: 3, date: 'invalid' },
      ],
    },
    now,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].date, localToday(new Date(date)));
  const series = {
    ...tv,
    metadata: { nextEpisodeDate: '2026-10-09', nextEpisodeNumber: 5, nextEpisodeSeason: 2 },
  };
  assert.equal(calendarEvents(series, null, now)[0].date, '2026-10-09');
  assert.match(calendarEvents(series, null, now)[0].label, /Temporada 2 · Episodio 5/);
  assert.deepEqual(calendarEvents(tv, null, now), []);
  assert.deepEqual(calendarEvents(series, null, new Date('2026-10-10T12:00:00Z')), []);
  const grouped = groupCalendarEvents(
    [...events, ...events, ...calendarEvents(series, null, now)],
    'Anime',
  );
  assert.equal(Object.values(grouped).flat().length, 1);
});
test('calendario conserva múltiples estrenos, respeta retrasos y deduplica filas', () => {
  const row = {
    route: 'anime',
    airType: 'raw',
    episodeNumber: 2,
    episodeDate: '2026-10-09T12:00:00Z',
  };
  const episodes = upcomingEpisodes(
    [
      row,
      row,
      { ...row, episodeNumber: 3, episodeDate: '2026-10-16T12:00:00Z' },
      {
        ...row,
        episodeNumber: 4,
        airingStatus: 'delayed-air',
        delayedUntil: '0001-01-01T00:00:00Z',
      },
    ],
    'anime',
    Date.parse('2026-10-08T12:00:00Z'),
  );
  assert.deepEqual(
    episodes.map((episode) => episode.episode),
    [2, 3],
  );
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.ok(monthCells('2028-02').some((cell) => cell.iso === '2028-02-29'));
});
