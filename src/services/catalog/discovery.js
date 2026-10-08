import { loadTitle } from './providers.js';
import { fromTmdb } from './adapters.js';
import { cachedJson } from './http.js';

// Small batches avoid a burst of requests when opening the home page.
export async function loadInBatches(items, task, isActive = () => true) {
  const results = [];
  for (let index = 0; index < items.length && isActive(); index += 2) {
    results.push(...(await Promise.allSettled(items.slice(index, index + 2).map(task))));
  }
  return results;
}

export async function loadSaga(title, isActive = () => true, limit = 24, options = {}) {
  const root = await loadTitle(title, options);
  if (
    title.providerIds?.tmdb &&
    title.category === 'Películas' &&
    root.title.metadata.collectionId
  ) {
    const data = await cachedJson(
      `/api/catalog/tmdb?${new URLSearchParams({ kind: 'collection', id: root.title.metadata.collectionId })}`,
      options,
    );
    return {
      items: (data.parts || []).map((part) => fromTmdb(part, 'movie')).filter(Boolean),
      relations: [],
      partial: false,
    };
  }
  if (!title.providerIds?.mal) return { items: [root.title], relations: [], partial: false };
  const items = new Map();
  const seen = new Set();
  const queue = [title];
  const relations = [];
  let partial = false;
  // Explore another batch only on request; never follow recommendations or crossovers.
  while (queue.length && seen.size < limit && isActive()) {
    const next = queue.shift();
    const key = `mal-${next.providerIds.mal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const data = await loadTitle(next, options);
      items.set(key, { ...data.title, id: key });
      relations.push(...(data.relations || []));
      for (const related of data.related) {
        const relation = data.relations?.find((edge) => edge.to === related.id);
        if (
          ![
            'prequel',
            'sequel',
            'side_story',
            'parent_story',
            'summary',
            'full_story',
            'alternative_version',
            'alternative_setting',
            'spin_off',
          ].includes(relation?.type)
        )
          continue;
        if (!seen.has(related.id) && !queue.some((item) => item.id === related.id))
          queue.push(related);
      }
    } catch {
      partial = true;
      items.set(key, { ...next, id: key });
    }
  }
  return {
    items: [...items.values()],
    relations,
    partial: partial || queue.length > 0,
    hasMore: queue.length > 0,
  };
}
