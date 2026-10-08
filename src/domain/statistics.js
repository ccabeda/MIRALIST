import { isMovie } from './library.js';

export function libraryStats(titles, library, period = '') {
  const saved = titles.filter((title) => library[title.id]);
  const episodic = saved.filter((title) => !isMovie(title));
  const dateOf = (title) =>
    isMovie(title) ? library[title.id].watchedDate : library[title.id].finishDate;
  const dated = saved.filter((title) => library[title.id].status === 'Completado' && dateOf(title));
  const included = period ? dated.filter((title) => dateOf(title).startsWith(period)) : saved;
  const rated = included.filter((title) => library[title.id].score > 0);
  return {
    chapters: (period ? included.filter((title) => !isMovie(title)) : episodic).reduce(
      (sum, title) => sum + library[title.id].progress,
      0,
    ),
    movies: included.filter((title) => isMovie(title) && library[title.id].status === 'Completado')
      .length,
    completed: included.filter(
      (title) => !isMovie(title) && library[title.id].status === 'Completado',
    ).length,
    average: rated.length
      ? rated.reduce((sum, title) => sum + library[title.id].score / 2, 0) / rated.length
      : null,
    rated: rated.length,
    undated: saved.filter((title) => library[title.id].status === 'Completado' && !dateOf(title))
      .length,
    years: [...new Set(dated.map((title) => dateOf(title).slice(0, 4)))].sort().reverse(),
  };
}
