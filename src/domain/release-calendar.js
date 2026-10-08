import { isMovie } from './library.js';
import { localToday } from './watch-dates.js';

export function calendarTitles(titles, library) {
  return titles.filter(
    (title) =>
      library[title.id] &&
      !isMovie(title) &&
      (title.providerIds?.mal || (title.providerIds?.tmdb && title.category === 'Series')),
  );
}

export function calendarEvents(title, schedule, now = new Date()) {
  if (title.providerIds?.mal) {
    const episodes = schedule?.upcoming || (schedule?.next ? [schedule.next] : []);
    return episodes
      .filter(
        (episode) =>
          Number.isInteger(episode.episode) &&
          episode.episode > 0 &&
          Date.parse(episode.date) > now.getTime(),
      )
      .map((episode) => ({
        id: `mal-${title.providerIds.mal}-${episode.episode}-${episode.date}`,
        date: localToday(new Date(episode.date)),
        title,
        label: `Episodio ${episode.episode}${episode.delayed ? ' · Reprogramado' : ''}`,
        source: 'AnimeSchedule',
        note: 'Emisión en Japón',
      }));
  }
  const meta = title.metadata || {};
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(meta.nextEpisodeDate || '') ||
    meta.nextEpisodeDate < localToday(now)
  )
    return [];
  return [
    {
      id: `tmdb-${title.providerIds?.tmdb}-${meta.nextEpisodeSeason}-${meta.nextEpisodeNumber}`,
      date: meta.nextEpisodeDate,
      title,
      label: `Temporada ${meta.nextEpisodeSeason ?? '?'} · Episodio ${meta.nextEpisodeNumber ?? '?'}`,
      source: 'TMDB',
      note: 'Fecha de estreno informada',
    },
  ];
}

export function groupCalendarEvents(events, category = 'Todos') {
  const grouped = {};
  const seen = new Set();
  for (const event of events) {
    if (seen.has(event.id) || (category !== 'Todos' && event.title.category !== category)) continue;
    seen.add(event.id);
    (grouped[event.date] ||= []).push(event);
  }
  for (const day of Object.values(grouped))
    day.sort((a, b) => a.title.title.localeCompare(b.title.title));
  return grouped;
}
