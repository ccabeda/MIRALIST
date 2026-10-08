import { canonicalTitle } from './organization.js';

// Preserve legacy IDs so an existing library and its folders never need to be rewritten.
export function mergeCatalog(current, incoming) {
  const next = [...current];
  for (const title of incoming) {
    if (!title) continue;
    const previous = canonicalTitle(title, next);
    if (!previous) next.push(title);
    else {
      const index = next.indexOf(previous);
      // Relation summaries contain only a name and ID; keep the richer stored record.
      const summary =
        (!title.year && title.format === 'Desconocido') ||
        (previous.metadata?.detailLevel === 'full' && title.metadata?.detailLevel !== 'full');
      next[index] = summary
        ? previous
        : {
            ...previous,
            ...title,
            id: previous.id,
            franchise: previous.franchise || title.franchise,
            aliases: [
              ...new Set([...(previous.aliases || []), ...(title.aliases || []), previous.title]),
            ],
            providerIds: { ...previous.providerIds, ...title.providerIds },
          };
    }
  }
  return next;
}
