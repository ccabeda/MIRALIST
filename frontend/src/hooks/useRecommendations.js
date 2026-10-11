import { recommendationSeeds, unseenRecommendations } from '../domain/discovery.js';
import { loadTitle } from '../services/catalog/providers.js';
import { loadInBatches } from '../services/catalog/discovery.js';
import useCatalogTask from './useCatalogTask.js';

export default function useRecommendations(titles, library, onTitles) {
  const seeds = recommendationSeeds(titles, library);
  const key = JSON.stringify(seeds.map((title) => title.id));
  const { result, refresh } = useCatalogTask(key, async (active, options) => {
    const outcomes = await loadInBatches(
      seeds,
      async (seed) => ({ seed, data: await loadTitle(seed, options) }),
      active,
    );
    if (!active()) return;
    const loaded = outcomes.filter((item) => item.status === 'fulfilled').map((item) => item.value);
    const groups = loaded.map(({ seed, data }) => ({ seed, items: data.recommendations || [] }));
    const suggestions = unseenRecommendations(groups, titles, library);
    const details = await loadInBatches(
      suggestions.map(({ title }) => title),
      (title) => loadTitle(title, options),
      active,
    );
    if (!active()) return;
    onTitles([
      ...loaded.flatMap(({ data }) => [data.title, ...(data.recommendations || [])]),
      ...details.filter((item) => item.status === 'fulfilled').map((item) => item.value.title),
    ]);
    return {
      groups,
      errors: [...outcomes, ...details].filter((item) => item.status === 'rejected').length,
    };
  });
  return {
    seeds,
    recommendations: unseenRecommendations(result?.groups || [], titles, library),
    result,
    refresh,
  };
}
