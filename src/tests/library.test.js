import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateProgress,
  parseLibrary,
  isMovie,
  validateWatchDates,
  formatStars,
} from '../domain/library.js';

test('completar y retroceder progreso mantiene estados coherentes', () => {
  const completed = updateProgress({ progress: 11, status: 'Viendo', score: 9 }, 1, 12);
  assert.equal(completed.status, 'Completado');
  assert.equal(completed.score, 9);
  assert.equal(updateProgress(completed, 1, 12).progress, 12);
  assert.equal(updateProgress(completed, -1, 12).status, 'Viendo');
  assert.equal(updateProgress({ progress: 0 }, -1, 12).progress, 0);
});
test('recuperación segura de almacenamiento inválido y biblioteca vacía', () => {
  assert.deepEqual(parseLibrary('invalid', { demo: true }), { demo: true });
  assert.deepEqual(parseLibrary('{}', { demo: true }), {});
  assert.deepEqual(parseLibrary('{"bad":{"status":"Viendo","progress":-1}}', {}), {});
});
test('un especial de un capítulo sigue siendo episódico y una película no', () => {
  assert.equal(isMovie({ category: 'Anime', format: 'Especial', total: 1 }), false);
  assert.equal(isMovie({ category: 'Anime', format: 'OVA', total: 1 }), false);
  assert.equal(isMovie({ category: 'Anime', format: 'Película', total: 1 }), true);
  assert.equal(isMovie({ category: 'Series', format: 'Serie', total: 9 }), false);
});

test('fechas opcionales válidas y orden cronológico', () => {
  assert.equal(validateWatchDates('', ''), '');
  assert.equal(validateWatchDates('', '2026-10-07'), '');
  assert.equal(validateWatchDates('2026-10-07', ''), '');
  assert.equal(validateWatchDates('2026-10-07', '2026-10-07'), '');
  assert.ok(validateWatchDates('2026-10-07', '2026-10-06'));
  assert.ok(validateWatchDates('2026-02-30', ''));
  assert.equal(validateWatchDates('2024-02-29', '2024-03-01'), '');
});

test('las entradas antiguas se conservan y las fechas sobreviven al actualizar capítulos', () => {
  const old = { status: 'Viendo', progress: 12, score: 9, favorite: true };
  const restored = parseLibrary(JSON.stringify({ frieren: old }), {});
  assert.deepEqual(restored.frieren, { ...old, startDate: '', finishDate: '' });
  const dated = { ...old, startDate: '2026-10-01', finishDate: '2026-10-07' };
  const next = updateProgress(dated, 16, 28);
  assert.equal(next.startDate, '2026-10-01');
  assert.equal(next.finishDate, '2026-10-07');
  assert.equal(
    parseLibrary(JSON.stringify({ frieren: next }), {}).frieren.finishDate,
    '2026-10-07',
  );
});

test('notas anteriores se expresan como estrellas con incrementos de media', () => {
  assert.equal(formatStars(0), 'Sin puntuar');
  assert.equal(formatStars(1), '½');
  assert.equal(formatStars(2), '1');
  assert.equal(formatStars(3), '1½');
  assert.equal(formatStars(9), '4½');
  assert.equal(formatStars(10), '5');
});
