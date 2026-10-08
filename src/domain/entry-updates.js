import { hasKnownTotal, isMovie, updateProgress, statuses } from './library.js';
import { distributeProgress, seasonsFor } from './seasons.js';
import { releaseLimits, seasonReleaseMax } from './release-limits.js';

export function applyEntryPatch(title, entry, patch) {
  const total = isMovie(title) ? 1 : title.total;
  let next = { ...entry, ...patch };
  const changedProgress = Object.hasOwn(patch, 'progress');
  const changedStatus = Object.hasOwn(patch, 'status');
  const limits = releaseLimits(title);
  if (changedStatus && !statuses.includes(patch.status)) return entry;
  if (changedStatus && !limits.statuses.includes(patch.status)) return entry;
  if (changedProgress && limits.unreleased) return { ...next, progress: 0, status: 'Pendiente' };
  if (changedStatus) {
    if (patch.status === 'Completado' && hasKnownTotal(total)) next.progress = total;
    if (patch.status === 'Pendiente') next.progress = 0;
  } else if (changedProgress) {
    if (Number.isInteger(limits.max)) next.progress = Math.min(next.progress, limits.max);
    next = updateProgress(next, 0, total);
    if (!limits.statuses.includes(next.status)) next.status = 'Viendo';
  }
  if (patch.seasonProgress && (changedProgress || changedStatus)) {
    next.seasonProgress = Object.fromEntries(
      seasonsFor(title).map((season) => [
        season.number,
        Math.min(patch.seasonProgress[season.number] || 0, seasonReleaseMax(title, season)),
      ]),
    );
    next.progress = Object.values(next.seasonProgress).reduce((sum, value) => sum + value, 0);
    if (changedProgress && !changedStatus) {
      next = updateProgress(next, 0, total);
      if (!limits.statuses.includes(next.status)) next.status = 'Viendo';
    }
  }
  if (
    (changedProgress || changedStatus) &&
    seasonsFor(title).length &&
    !Object.hasOwn(patch, 'seasonProgress')
  )
    next.seasonProgress = distributeProgress(title, next.progress);
  return next;
}
