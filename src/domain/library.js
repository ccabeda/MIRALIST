import { hasKnownTotal, isRecord, safeId } from './entry-fields.js';
import { normalizeEntry } from './entry-validation.js';
export { statuses, isMovie, hasKnownTotal, validateWatchDates } from './entry-fields.js';

// Se conserva el valor entero 0–10 para no perder las notas anteriores.
// Cada punto equivale a media estrella en la interfaz de 5 estrellas.
export function formatStars(score) {
  if (!score) return 'Sin puntuar';
  return `${Math.floor(score / 2) || ''}${score % 2 ? '½' : ''}`;
}

export function updateProgress(entry, delta, total) {
  const amount = Number(entry.progress || 0) + Number(delta);
  const progress = Math.max(
    0,
    Math.min(
      hasKnownTotal(total) ? total : Infinity,
      Number.isFinite(amount) ? Math.trunc(amount) : entry.progress || 0,
    ),
  );
  return {
    ...entry,
    progress,
    status:
      hasKnownTotal(total) && progress === total
        ? 'Completado'
        : progress > 0
          ? 'Viendo'
          : 'Pendiente',
  };
}
export function parseLibrary(raw, fallback, titles = []) {
  try {
    const value = JSON.parse(raw);
    if (!isRecord(value)) return fallback;
    const entries = [];
    for (const [id, entry] of Object.entries(value)) {
      if (!safeId(id)) continue;
      try {
        const title = titles.find((title) => title.id === id) || entry?.catalog;
        entries.push([id, normalizeEntry(entry, title, { repairDates: true })]);
      } catch {
        /* Ignore invalid entries while recovering valid saved data. */
      }
    }
    return Object.fromEntries(entries);
  } catch {
    return fallback;
  }
}
