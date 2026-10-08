import { cachedJson } from './http.js';
import { localToday } from '../../domain/watch-dates.js';

export async function loadAnimeSchedule(title, options = {}) {
  const params = new URLSearchParams({ malId: title.providerIds.mal });
  if (options.force) params.set('refresh', options.refreshAt || Date.now());
  return cachedJson(`/api/catalog/schedule?${params}`, options);
}

export function animeReleaseInfo(schedule, now = Date.now()) {
  if (!schedule)
    return { date: null, text: 'No se pudo consultar AnimeSchedule. Volvé a intentar.' };
  const next = schedule.next;
  if (next && Date.parse(next.date) > now) {
    return {
      date: localToday(new Date(next.date)),
      text: `Episodio ${next.episode} · Emisión en Japón${next.delayed ? ' · Reprogramado' : ''}`,
      source: 'AnimeSchedule',
    };
  }
  return {
    date: null,
    text: schedule.delayed
      ? 'Emisión pausada: sin próxima fecha confirmada.'
      : 'Sin fecha confirmada en el calendario de esta semana y la próxima.',
    source: 'AnimeSchedule',
  };
}
