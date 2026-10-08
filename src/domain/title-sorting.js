import { isMovie } from './library.js';

export function sortTitles(titles, library, order) {
  const positions = Object.keys(library);
  return [...titles].sort((a, b) => {
    const left = library[a.id],
      right = library[b.id];
    if (order === 'title') return a.title.localeCompare(b.title, 'es');
    if (order === 'score') return right.score - left.score || a.title.localeCompare(b.title, 'es');
    if (order === 'finished')
      return (
        ((isMovie(b) ? right.watchedDate : right.finishDate) || '').localeCompare(
          (isMovie(a) ? left.watchedDate : left.finishDate) || '',
        ) || a.title.localeCompare(b.title, 'es')
      );
    return (
      (right.addedAt || '').localeCompare(left.addedAt || '') ||
      positions.indexOf(b.id) - positions.indexOf(a.id)
    );
  });
}
