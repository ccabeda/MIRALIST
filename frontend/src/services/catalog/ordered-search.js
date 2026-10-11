import { orderCatalog } from '../../domain/catalog-order.js';

// Cache only completed searches. A partial result must never look globally sorted.
export function createOrderedSearch(loadPage) {
  const cache = new Map();
  return async (search, options = {}) => {
    const { category, query, format, page = 1, order } = search;
    const key = JSON.stringify([category, query.trim()]);
    const checkActive = () => {
      if (options.isActive && !options.isActive()) throw new Error('Búsqueda cancelada.');
    };
    checkActive();
    let hit = cache.get(key);
    if (options.force || !hit || hit.expires <= Date.now()) {
      const entries = new Map();
      for (let current = 1; ; current++) {
        checkActive();
        const result = await loadPage({ category, query, format: 'Todos', page: current }, options);
        checkActive();
        if (result.totalPages > 500 || (current === 500 && result.hasNext))
          throw new Error(
            'La búsqueda supera el límite del catálogo. Escribí un título más específico para ordenar todos sus resultados.',
          );
        for (const item of result.items) if (!entries.has(item.id)) entries.set(item.id, item);
        options.onProgress?.(current);
        if (!result.hasNext) break;
      }
      hit = { items: [...entries.values()], expires: Date.now() + 300000 };
      if (cache.size >= 5) cache.delete(cache.keys().next().value);
      cache.set(key, hit);
    }
    const filtered =
      category === 'Anime' && format && format !== 'Todos'
        ? hit.items.filter((item) => item.format === format)
        : hit.items;
    const sorted = orderCatalog(filtered, order);
    const size = category === 'Anime' ? 24 : 20;
    return {
      items: sorted.slice((page - 1) * size, page * size),
      hasNext: page * size < sorted.length,
      total: sorted.length,
    };
  };
}
