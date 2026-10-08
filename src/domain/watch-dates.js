import { isMovie, validateWatchDates } from './library.js';

export function migrateMovieDates(library, titles) {
  return Object.fromEntries(
    Object.entries(library).map(([id, entry]) => [
      id,
      titles.some((title) => title.id === id && isMovie(title))
        ? { ...entry, watchedDate: entry.watchedDate ?? entry.finishDate ?? '' }
        : entry,
    ]),
  );
}
export function suggestTitleDate(title, previous, next, today = localToday()) {
  if (!isMovie(title)) return dateSuggestion(previous, next, today);
  return next.status === 'Completado' && previous.status !== 'Completado' && !next.watchedDate
    ? { field: 'watchedDate', date: today }
    : null;
}

export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function dateSuggestion(previous, next, today = localToday()) {
  const field =
    next.status === 'Completado' && previous.status !== 'Completado'
      ? 'finishDate'
      : next.status === 'Viendo' && previous.status !== 'Viendo'
        ? 'startDate'
        : null;
  if (!field || next[field]) return null;
  const dates = {
    startDate: next.startDate || '',
    finishDate: next.finishDate || '',
    [field]: today,
  };
  return validateWatchDates(dates.startDate, dates.finishDate) ? null : { field, date: today };
}
