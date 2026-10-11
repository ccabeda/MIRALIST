import { isMovie } from './library.js';
import { seasonProgress } from './seasons.js';

export function reopenForNewEpisodes(library, update, now = Date.now()) {
  const title = update.title;
  const entry = library[title.id];
  if (!entry || entry.status !== 'Completado' || isMovie(title)) return library;
  const watched = seasonProgress(title, entry);
  const hasUnwatched = (update.episodes || []).some((episode) => {
    const date = Date.parse(episode.date);
    if (
      !Number.isFinite(date) ||
      date > now ||
      !Number.isInteger(episode.episode) ||
      episode.episode < 1
    )
      return false;
    if (title.category === 'Series')
      return (
        Number.isInteger(episode.season) &&
        episode.season > 0 &&
        episode.episode > (watched[episode.season] || 0)
      );
    return episode.episode > entry.progress;
  });
  if (!hasUnwatched) return library;
  // Automatic reopening is not a manual reset to Pending: keep all watch history.
  return { ...library, [title.id]: { ...entry, status: 'Pendiente' } };
}
