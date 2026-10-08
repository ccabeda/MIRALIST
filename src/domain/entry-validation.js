import {
  hasKnownTotal,
  isMovie,
  isRecord,
  safeId,
  statuses,
  validDate,
  validateWatchDates,
} from './entry-fields.js';
import { normalizeTitle } from './catalog.js';

// Recovery repairs only optional dates. Core values follow the same rules as imports.
export function normalizeEntry(entry, title, { repairDates = false } = {}) {
  const total = isMovie(title) ? 1 : title?.total;
  if (
    !isRecord(entry) ||
    !statuses.includes(entry.status) ||
    !Number.isInteger(entry.progress) ||
    entry.progress < 0 ||
    (hasKnownTotal(total) && entry.progress > total) ||
    !Number.isInteger(entry.score) ||
    entry.score < 0 ||
    entry.score > 10 ||
    (entry.favorite !== undefined && typeof entry.favorite !== 'boolean') ||
    (entry.notes !== undefined && (typeof entry.notes !== 'string' || entry.notes.length > 2000))
  )
    throw new Error('Datos de seguimiento inválidos.');
  let startDate = entry.startDate ?? '',
    finishDate = entry.finishDate ?? '';
  if (repairDates) {
    if (!validDate(startDate)) startDate = '';
    if (!validDate(finishDate) || validateWatchDates(startDate, finishDate)) finishDate = '';
  }
  if (validateWatchDates(startDate, finishDate)) throw new Error('Fechas inválidas.');
  const clean = {
    status: entry.status,
    progress: entry.progress,
    score: entry.score,
    favorite: entry.favorite ?? false,
    ...(entry.notes !== undefined ? { notes: entry.notes } : {}),
    startDate,
    finishDate,
  };
  if (isMovie(title) || entry.watchedDate !== undefined) {
    let watchedDate = entry.watchedDate ?? finishDate;
    if (repairDates && !validDate(watchedDate)) watchedDate = '';
    if (!validDate(watchedDate)) throw new Error('Fecha de visionado inválida.');
    clean.watchedDate = watchedDate;
  }
  if (entry.addedAt !== undefined) {
    if (typeof entry.addedAt !== 'string' || !Number.isFinite(Date.parse(entry.addedAt)))
      throw new Error('Fecha de alta inválida.');
    clean.addedAt = new Date(entry.addedAt).toISOString();
  }
  if (entry.seasonProgress !== undefined) {
    if (!isRecord(entry.seasonProgress)) throw new Error('Progreso de temporadas inválido.');
    const values = Object.entries(entry.seasonProgress);
    if (
      values.some(
        ([key, value]) =>
          !/^\d+$/.test(key) || !safeId(key) || !Number.isInteger(value) || value < 0,
      ) ||
      values.reduce((sum, [, value]) => sum + value, 0) !== entry.progress
    )
      throw new Error('El total de capítulos no coincide con las temporadas.');
    if (
      title?.seasons?.some(
        (season) =>
          Object.hasOwn(entry.seasonProgress, season.number) &&
          entry.seasonProgress[season.number] > season.total,
      )
    )
      throw new Error('Progreso de temporadas inválido.');
    clean.seasonProgress = Object.fromEntries(values);
  }
  if (entry.catalog !== undefined) {
    const catalog = normalizeTitle(entry.catalog);
    if (!catalog) throw new Error('Ficha guardada inválida.');
    clean.catalog = catalog;
  }
  return clean;
}
