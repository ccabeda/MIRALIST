export function relatedTitles(title, titles) {
  return titles.filter(
    (candidate) =>
      candidate.id !== title.id &&
      ((title.franchise && candidate.franchise === title.franchise) ||
        title.relatedIds?.includes(candidate.id)),
  );
}
export function similarTitles(title, titles, library = {}) {
  const related = new Set(relatedTitles(title, titles).map((item) => item.id));
  return titles
    .filter(
      (candidate) =>
        candidate.id !== title.id &&
        !related.has(candidate.id) &&
        candidate.category === title.category &&
        candidate.genre === title.genre &&
        library[candidate.id]?.status !== 'Completado',
    )
    .slice(0, 4);
}
export function personalRecommendations(titles, library) {
  const seeds = titles.filter(
    (title) => library[title.id]?.status === 'Completado' || library[title.id]?.favorite,
  );
  return titles
    .filter((title) => !library[title.id] || library[title.id].status === 'Pendiente')
    .map((title) => {
      const franchise = seeds.find(
        (seed) => seed.id !== title.id && seed.franchise && seed.franchise === title.franchise,
      );
      const genre = seeds.find(
        (seed) =>
          seed.id !== title.id && seed.genre === title.genre && seed.category === title.category,
      );
      return { title, seed: franchise || genre, weight: franchise ? 2 : genre ? 1 : 0 };
    })
    .filter((item) => item.weight)
    .sort((a, b) => b.weight - a.weight || a.title.title.localeCompare(b.title.title, 'es'))
    .slice(0, 4);
}
