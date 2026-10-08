import { hasKnownTotal, isMovie, updateProgress, statuses } from './library.js';
import { distributeProgress, seasonsFor } from './seasons.js';

export function applyEntryPatch(title, entry, patch) {
  const total = isMovie(title) ? 1 : title.total;
  let next = { ...entry, ...patch };
  const changedProgress = Object.hasOwn(patch, 'progress');
  const changedStatus = Object.hasOwn(patch, 'status');
  if (changedStatus && !statuses.includes(patch.status)) return entry;
  if (changedStatus) {
    if (patch.status === 'Completado' && hasKnownTotal(total)) next.progress = total;
    if (patch.status === 'Pendiente') next.progress = 0;
  } else if (changedProgress) {
    next = updateProgress(next, 0, total);
  }
  if (
    (changedProgress || changedStatus) &&
    seasonsFor(title).length &&
    !Object.hasOwn(patch, 'seasonProgress')
  )
    next.seasonProgress = distributeProgress(title, next.progress);
  return next;
}
