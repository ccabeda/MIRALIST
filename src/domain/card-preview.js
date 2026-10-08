import { isMovie } from './library.js';

export function previewFacts(title) {
  const meta = title.metadata || {};
  const movie = isMovie(title);
  let premiere = meta.startDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(premiere || '')) {
    const date = new Date(`${premiere}T12:00:00`);
    premiere = Number.isFinite(date.getTime())
      ? date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
  } else premiere = null;
  const facts = [
    ['Formato', movie ? 'Película' : title.format],
    ['Estreno', premiere || meta.season || (title.year ? String(title.year) : null)],
  ];
  if (movie) facts.push(['Duración', meta.duration]);
  else {
    facts.push(['Episodios', title.total > 0 ? String(title.total) : null]);
    if (title.category === 'Series') {
      const seasons =
        meta.seasonCount ?? title.seasons?.filter((season) => season.number > 0).length;
      facts.push(['Temporadas', seasons > 0 ? String(seasons) : null]);
    }
  }
  return facts.map(([label, value]) => [
    label,
    value && value !== 'Desconocido' ? value : 'No disponible',
  ]);
}
