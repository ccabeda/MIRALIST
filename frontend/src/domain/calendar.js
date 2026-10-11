export const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
export function monthCells(month) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const count = Math.ceil((offset + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first);
    day.setUTCDate(1 - offset + index);
    const iso = day.toISOString().slice(0, 10);
    return { iso, day: day.getUTCDate(), inMonth: iso.startsWith(month) };
  });
}
export function shiftDay(iso, amount) {
  const day = new Date(`${iso}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + amount);
  const result = day.toISOString().slice(0, 10);
  return result >= '0001-01-01' && result <= '9999-12-31' && result.length === 10 ? result : iso;
}
export function shiftMonth(month, amount) {
  const day = new Date(`${month}-01T12:00:00Z`);
  day.setUTCMonth(day.getUTCMonth() + amount);
  const result = day.toISOString().slice(0, 7);
  return result >= '0001-01' && result <= '9999-12' && result.length === 7 ? result : month;
}
export function dateAllowed(value, min = '0001-01-01', max = '9999-12-31') {
  return value >= (min || '0001-01-01') && value <= (max || '9999-12-31');
}
export function displayDate(value) {
  if (!value) return 'Elegir fecha';
  const [year, month, day] = value.split('-');
  return `${Number(day)} ${months[Number(month) - 1].toLocaleLowerCase()} ${year}`;
}
