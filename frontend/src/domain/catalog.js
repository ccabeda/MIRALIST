import { hasKnownTotal, isRecord, safeId } from './entry-fields.js';

// A saved title is independent of the current search results or provider availability.
export function normalizeTitle(value) {
  if (
    !isRecord(value) ||
    !safeId(value.id) ||
    typeof value.title !== 'string' ||
    !value.title.trim()
  )
    return null;
  const text = (key, fallback = '') => (typeof value[key] === 'string' ? value[key] : fallback);
  const providerIds = Object.fromEntries(
    Object.entries(isRecord(value.providerIds) ? value.providerIds : {}).filter(
      ([key, id]) => safeId(key) && ['string', 'number'].includes(typeof id),
    ),
  );
  const seasons = Array.isArray(value.seasons)
    ? value.seasons
        .filter(
          (season) =>
            isRecord(season) &&
            Number.isInteger(season.number) &&
            season.number >= 0 &&
            hasKnownTotal(season.total),
        )
        .map(({ number, total }) => ({ number, total }))
    : [];
  return {
    id: value.id,
    title: value.title.trim(),
    subtitle: text('subtitle'),
    category: text('category', 'Sin clasificar'),
    format: text('format', 'Desconocido'),
    year: Number.isInteger(value.year) ? value.year : null,
    total: hasKnownTotal(value.total) ? value.total : null,
    genre: text('genre', 'Sin género'),
    description: text('description'),
    cover: /^https:\/\//.test(text('cover')) ? text('cover') : '',
    color: /^#[\da-f]{3,8}$/i.test(value.color || '') ? value.color : '#777777',
    mark: text('mark', '◉'),
    franchise: text('franchise'),
    aliases: Array.isArray(value.aliases)
      ? value.aliases.filter((item) => typeof item === 'string')
      : [],
    relatedIds: Array.isArray(value.relatedIds) ? value.relatedIds.filter(safeId) : [],
    providerIds,
    ...(seasons.length ? { seasons } : {}),
    metadata: isRecord(value.metadata)
      ? Object.fromEntries(
          Object.entries(value.metadata).filter(
            ([key, item]) =>
              safeId(key) && (item === null || ['string', 'number'].includes(typeof item)),
          ),
        )
      : {},
  };
}

export function buildCatalog(available, library) {
  const byId = new Map(available.map((title) => [title.id, title]));
  for (const [id, entry] of Object.entries(library)) {
    if (byId.has(id)) continue;
    const saved = normalizeTitle(entry.catalog);
    const title = saved?.id === id ? saved : normalizeTitle({ id, title: `Obra guardada (${id})` });
    if (title) byId.set(id, title);
  }
  return [...byId.values()];
}
