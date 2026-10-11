import { updateProgress } from './library.js';

// Anime conserva las fichas independientes del catálogo. Solo series con temporadas conocidas.
export function seasonsFor(title) {
  return title.category === 'Series' ? title.seasons || [] : [];
}
export function seasonProgress(title, entry) {
  let remaining = entry.progress || 0;
  return Object.fromEntries(
    seasonsFor(title).map((season) => {
      const stored = entry.seasonProgress?.[season.number];
      const value = Number.isInteger(stored)
        ? Math.max(0, Math.min(season.total, stored))
        : Math.min(season.total, remaining);
      remaining = Math.max(0, remaining - value);
      return [season.number, value];
    }),
  );
}
export function updateSeason(title, entry, number, value) {
  const season = seasonsFor(title).find((item) => item.number === number);
  if (!season) return entry;
  const values = {
    ...seasonProgress(title, entry),
    [number]: Math.max(0, Math.min(season.total, Math.trunc(Number(value)) || 0)),
  };
  const progress = Object.values(values).reduce((sum, item) => sum + item, 0);
  return {
    ...updateProgress(entry, progress - entry.progress, title.total),
    seasonProgress: values,
  };
}
export function distributeProgress(title, progress) {
  return seasonProgress(title, { progress });
}
