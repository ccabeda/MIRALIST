import { loadAnimeSchedule } from './schedule.js';

export async function withReleaseProgress(title, options = {}) {
  if (!title.providerIds?.mal || title.metadata?.status !== 'En emisión') return title;
  try {
    const schedule = await loadAnimeSchedule(title, options);
    const aired = (schedule.recent || [])
      .filter((item) => Date.parse(item.date) <= Date.now())
      .map((item) => item.episode)
      .filter((episode) => Number.isInteger(episode) && episode > 0);
    // Only confirmed aired episodes count; future dates never imply an emission.
    if (!aired.length) return title;
    const count = Math.max(...aired);
    if (title.total && count > title.total) return title;
    return { ...title, metadata: { ...title.metadata, airedEpisodes: count } };
  } catch {
    // An unavailable calendar must not hide the rest of the title's information.
    return title;
  }
}
