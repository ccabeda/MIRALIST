import { loadTitle } from './providers.js';
import { loadAnimeSchedule } from './schedule.js';
import { isMovie } from '../../domain/library.js';
import { seasonProgress } from '../../domain/seasons.js';

export function notificationTitles(titles, library) {
  return titles.filter(
    (title) =>
      library[title.id] &&
      (title.providerIds?.mal || (title.providerIds?.tmdb && title.category === 'Series')),
  );
}

export async function loadNotificationUpdate(title, entry, options = {}) {
  const episodic = !isMovie(title);
  const [detail, schedule] = await Promise.allSettled([
    loadTitle(title, options),
    episodic && title.providerIds?.mal ? loadAnimeSchedule(title, options) : Promise.resolve(null),
  ]);
  const update = {
    title: detail.status === 'fulfilled' ? detail.value.title : title,
    errors: Number(detail.status === 'rejected') + Number(schedule.status === 'rejected'),
  };
  if (title.providerIds?.mal && detail.status === 'fulfilled') {
    const allowed = new Set(
      (detail.value.relations || []).filter((edge) => edge.type !== 'other').map((edge) => edge.to),
    );
    update.related = detail.value.related.filter((related) =>
      allowed.has(`mal-${related.providerIds.mal}`),
    );
  }
  if (episodic && title.providerIds?.mal && schedule.status === 'fulfilled') {
    update.episodes = (schedule.value?.recent || [])
      .filter((episode) => episode.episode > (entry.progress || 0))
      .map((episode) => ({ ...episode, source: 'AnimeSchedule' }));
  }
  if (episodic && title.providerIds?.tmdb && detail.status === 'fulfilled') {
    const meta = detail.value.title.metadata;
    // TMDB supplies a date, not an exact airing time: notify after that local day ends.
    const date = meta.lastEpisodeDate;
    const watched = seasonProgress(detail.value.title, entry)[meta.lastEpisodeSeason] || 0;
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(date || '') &&
      meta.lastEpisodeNumber > watched &&
      meta.lastEpisodeSeason > 0
    ) {
      update.episodes = [
        {
          episode: meta.lastEpisodeNumber,
          season: meta.lastEpisodeSeason,
          date: new Date(`${date}T23:59:59`).toISOString(),
          source: 'TMDB',
        },
      ];
    }
  }
  return update;
}
