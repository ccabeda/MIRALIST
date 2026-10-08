export const statuses = ['Pendiente', 'Viendo', 'Completado', 'Pausado', 'Abandonado'];
export const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const safeId = (id) =>
  typeof id === 'string' &&
  id.length > 0 &&
  id.length <= 150 &&
  !['__proto__', 'constructor', 'prototype'].includes(id);
export const hasKnownTotal = (total) => Number.isInteger(total) && total > 0;
export const isMovie = (title) => title?.format === 'Película' || title?.category === 'Películas';

export function validDate(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateWatchDates(startDate, finishDate) {
  if (!validDate(startDate) || !validDate(finishDate)) return 'Ingresá fechas válidas.';
  if (startDate && finishDate && finishDate < startDate)
    return 'La fecha de finalización no puede ser anterior a la fecha de inicio.';
  return '';
}
