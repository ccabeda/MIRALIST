import { remoteTitle, releaseInfo } from '../domain/discovery.js';
import { isMovie } from '../domain/library.js';
import { loadTitle } from '../services/catalog/providers.js';
import { loadInBatches } from '../services/catalog/discovery.js';
import { loadAnimeSchedule, animeReleaseInfo } from '../services/catalog/schedule.js';
import useCatalogTask from './useCatalogTask.js';

export default function useUpcomingReleases(titles, library, onTitles) {
  const following = titles.filter(
    (title) => remoteTitle(title) && !isMovie(title) && library[title.id]?.status === 'Viendo',
  );
  const key = JSON.stringify(following.map((title) => title.id).sort());
  const { result, refresh } = useCatalogTask(key, async (active, options) => {
    const outcomes = await loadInBatches(
      following,
      async (title) => {
        const [detail, schedule] = await Promise.allSettled([
          loadTitle(title, options),
          title.providerIds?.mal ? loadAnimeSchedule(title, options) : Promise.resolve(null),
        ]);
        const full = detail.status === 'fulfilled' ? detail.value.title : title;
        const animeSchedule =
          title.providerIds?.mal && !['Finalizado', 'Cancelada'].includes(full.metadata?.status);
        return {
          title: full,
          info: animeSchedule
            ? schedule.status === 'fulfilled'
              ? animeReleaseInfo(schedule.value)
              : null
            : detail.status === 'fulfilled'
              ? releaseInfo(full)
              : null,
          errors: [detail, schedule].filter((item) => item.status === 'rejected').length,
        };
      },
      active,
    );
    const releases = outcomes
      .filter((item) => item.status === 'fulfilled')
      .map((item) => item.value);
    if (active()) onTitles(releases.map((item) => item.title));
    return {
      releases,
      errors:
        outcomes.filter((item) => item.status === 'rejected').length +
        releases.reduce((sum, item) => sum + item.errors, 0),
    };
  });
  const releases = following
    .map(
      (title) =>
        result?.releases?.find((item) => item.title.id === title.id) || { title, info: null },
    )
    .sort((a, b) => (a.info?.date || '9999').localeCompare(b.info?.date || '9999'));
  return { following, releases, result, refresh };
}
