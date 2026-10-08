import { cachedJson } from './http.js';
import { fromMal, fromTmdb } from './adapters.js';

export const animeFormats = {
  Todos: '',
  TV: 'tv',
  OVA: 'ova',
  ONA: 'ona',
  Película: 'movie',
  Especial: 'special',
  'Especial de TV': 'tv_special',
  Música: 'music',
};

export async function searchCatalog({ category, query, format, page }, options = {}) {
  const search = query.trim();
  if (search.length < 3) return { items: [], hasNext: false };
  if (category === 'Anime') {
    const params = new URLSearchParams({ page, query: search });
    const result = await cachedJson(`/api/catalog/mal?${params}`, options);
    if (!Array.isArray(result.data))
      throw new Error('El catálogo devolvió una respuesta inesperada.');
    return {
      items: result.data
        .filter(({ node }) => !animeFormats[format] || node?.media_type === animeFormats[format])
        .map(({ node }) => fromMal(node))
        .filter(Boolean),
      hasNext: !!result.paging?.next,
    };
  }
  const kind = category === 'Series' ? 'tv' : 'movie';
  const params = new URLSearchParams({ kind, page, query: search });
  const result = await cachedJson(`/api/catalog/tmdb?${params}`, options);
  if (!Array.isArray(result.results))
    throw new Error('El catálogo devolvió una respuesta inesperada.');
  return {
    items: result.results.map((item) => fromTmdb(item, kind)).filter(Boolean),
    hasNext: page < Math.min(result.total_pages || 1, 500),
  };
}

export async function loadTitle(title, options = {}) {
  if (title.providerIds?.mal) {
    const result = await cachedJson(
      `/api/catalog/mal?${new URLSearchParams({ id: title.providerIds.mal })}`,
      options,
    );
    const full = fromMal(result);
    if (!full) throw new Error('No se encontró la ficha de esta obra.');
    full.metadata.detailLevel = 'full';
    const related = (result.related_anime || []).map(({ node }) => fromMal(node)).filter(Boolean);
    const recommendations = (result.recommendations || [])
      .slice(0, 6)
      .map(({ node }) => fromMal(node))
      .filter(Boolean);
    const relations = (result.related_anime || [])
      .filter(({ node }) => Number.isInteger(node?.id))
      .map(({ node, relation_type }) => ({
        from: `mal-${result.id}`,
        to: `mal-${node.id}`,
        type: relation_type,
      }));
    return { title: { ...full, id: title.id }, related, recommendations, relations };
  }
  if (title.providerIds?.tmdb) {
    const kind = title.category === 'Series' ? 'tv' : 'movie';
    const result = await cachedJson(
      `/api/catalog/tmdb?${new URLSearchParams({ kind, id: title.providerIds.tmdb })}`,
      options,
    );
    const full = fromTmdb(result, kind);
    if (!full) throw new Error('No se encontró la ficha de esta obra.');
    full.metadata.detailLevel = 'full';
    return {
      title: { ...full, id: title.id },
      related: [],
      recommendations: (result.recommendations?.results || [])
        .map((item) => fromTmdb(item, kind))
        .filter(Boolean),
    };
  }
  return { title, related: [] };
}

export const catalogConfiguration = (options = {}) =>
  cachedJson('/api/catalog/config', { ttl: 10000, ...options });
