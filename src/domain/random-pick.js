export function pendingTitles(titles, library, category = 'Todos', genre = 'Todos') {
  return titles.filter(
    (title) =>
      library[title.id]?.status === 'Pendiente' &&
      (category === 'Todos' || title.category === category) &&
      (genre === 'Todos' || title.genre === genre),
  );
}
export function choosePending(candidates, previousId, random = Math.random) {
  const pool =
    candidates.length > 1 ? candidates.filter((title) => title.id !== previousId) : candidates;
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : null;
}
