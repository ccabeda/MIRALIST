import React from 'react';
import { isMovie } from '../../domain/library.js';

const date = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
const percent = (value) => (value == null ? null : `${value}%`);
export default function TitleFacts({ title }) {
  const meta = title.metadata || {};
  const fields = [
    ['Formato', title.format],
    [isMovie(title) ? 'Entregas' : 'Capítulos', title.total],
    [isMovie(title) ? 'Duración' : 'Duración por capítulo', meta.duration],
    ['Estado de emisión', meta.status],
    ['Estreno', date(meta.startDate)],
    ...(!isMovie(title)
      ? [
          ['Fin de emisión', date(meta.endDate)],
          ['Temporada de estreno', meta.season],
        ]
      : []),
    ['Puntuación promedio', percent(meta.averageScore)],
    ['Media de puntuaciones', percent(meta.meanScore)],
    ['Popularidad', meta.popularity?.toLocaleString('es-AR')],
    ['Favoritos del catálogo', meta.favorites?.toLocaleString('es-AR')],
    ['Estudios', meta.studios],
    ['Material original', meta.source],
  ];
  return (
    <dl className="catalog-facts">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={value == null ? 'unavailable' : ''}>{value ?? 'No disponible'}</dd>
        </div>
      ))}
    </dl>
  );
}
