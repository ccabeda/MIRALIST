import { hasKnownTotal, isMovie, statuses } from './entry-fields.js';
import { localToday } from './watch-dates.js';

export function releaseLimits(title, now = new Date()) {
  const meta = title.metadata || {};
  const total = isMovie(title) ? 1 : title.total;
  const unreleased =
    meta.status === 'Próximamente' || (meta.startDate && meta.startDate > localToday(now));
  const ongoing = meta.status === 'En emisión';
  let aired = Number.isInteger(meta.airedEpisodes) ? meta.airedEpisodes : null;
  if (
    title.category === 'Series' &&
    Number.isInteger(meta.lastEpisodeSeason) &&
    Number.isInteger(meta.lastEpisodeNumber) &&
    title.seasons?.length
  ) {
    const earlier = (title.seasons || []).filter((s) => s.number < meta.lastEpisodeSeason);
    aired = earlier.reduce((sum, season) => sum + season.total, 0) + meta.lastEpisodeNumber;
  }
  if (!ongoing && ['Finalizado', 'Estrenada'].includes(meta.status)) aired = total;
  const max = unreleased
    ? 0
    : Number.isInteger(aired) && aired >= 0
      ? Math.min(aired, hasKnownTotal(total) ? total : Infinity)
      : hasKnownTotal(total)
        ? total
        : undefined;
  const incomplete = ongoing || (Number.isInteger(max) && hasKnownTotal(total) && max < total);
  return {
    max,
    unreleased: !!unreleased,
    confirmed: !!unreleased || Number.isInteger(aired),
    statuses: unreleased
      ? ['Pendiente']
      : statuses.filter((status) => status !== 'Completado' || !incomplete),
  };
}

export function seasonReleaseMax(title, season) {
  const limits = releaseLimits(title);
  if (limits.unreleased) return 0;
  const meta = title.metadata || {};
  if (
    meta.status !== 'Finalizado' &&
    Number.isInteger(meta.lastEpisodeSeason) &&
    Number.isInteger(meta.lastEpisodeNumber)
  ) {
    if (season.number > meta.lastEpisodeSeason) return 0;
    if (season.number === meta.lastEpisodeSeason)
      return Math.min(season.total, meta.lastEpisodeNumber);
  }
  return season.total;
}
