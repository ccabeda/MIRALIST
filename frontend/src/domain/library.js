import { hasKnownTotal } from './entry-fields.js';
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
