import { canonicalTitle, sameWork } from './organization.js';
import { localToday } from './watch-dates.js';

export const remoteTitle = (title) => !!(title.providerIds?.mal || title.providerIds?.tmdb);

export function recommendationSeeds(titles, library) {
  return titles
    .filter(
      (title) =>
        remoteTitle(title) &&
        (library[title.id]?.favorite || library[title.id]?.status === 'Completado'),
    )
    .sort(
      (a, b) =>
        Number(!!library[b.id].favorite) - Number(!!library[a.id].favorite) ||
        (library[b.id].addedAt || '').localeCompare(library[a.id].addedAt || '') ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 4);
}

export function unseenRecommendations(groups, titles, library) {
  const result = [];
  // Round-robin keeps one seed from taking over all the suggestions.
  const length = Math.max(0, ...groups.map((group) => group.items.length));
  for (let index = 0; index < length; index++) {
    for (const { seed, items } of groups) {
      const candidate = items[index];
      if (!candidate || sameWork(candidate, seed)) continue;
      const title = canonicalTitle(candidate, titles) || candidate;
      const entry = library[title.id];
      if (
        entry &&
        (entry.status !== 'Pendiente' ||
          entry.progress > 0 ||
          entry.watchedDate ||
          entry.finishDate)
      )
        continue;
      if (!result.some((item) => sameWork(item.title, title))) result.push({ title, seed });
      if (result.length === 8) return result;
    }
  }
  return result;
}

const days = {
  monday: 'lunes',
  tuesday: 'martes',
  wednesday: 'miércoles',
  thursday: 'jueves',
  friday: 'viernes',
  saturday: 'sábado',
  sunday: 'domingo',
};
export function releaseInfo(title, today = localToday()) {
  const meta = title.metadata || {};
  if (['Finalizado', 'Cancelada'].includes(meta.status))
    return { text: 'Finalizada: sin próximos capítulos.', date: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(meta.nextEpisodeDate || '') && meta.nextEpisodeDate >= today) {
    return {
      date: meta.nextEpisodeDate,
      text: `Temporada ${meta.nextEpisodeSeason ?? '?'} · Episodio ${meta.nextEpisodeNumber ?? '?'}`,
    };
  }
  if (meta.status === 'En emisión' && days[meta.broadcastDay]) {
    return {
      date: null,
      text: `Horario habitual: ${days[meta.broadcastDay]}${/^\d{2}:\d{2}$/.test(meta.broadcastTime || '') ? ` ${meta.broadcastTime}` : ''} (Japón, UTC+9). Sin fecha confirmada del próximo capítulo.`,
    };
  }
  return { date: null, text: 'Sin fecha confirmada para el próximo capítulo.' };
}

export const relationNames = {
  prequel: 'Precuela',
  sequel: 'Secuela',
  side_story: 'Historia paralela',
  parent_story: 'Historia principal',
  summary: 'Resumen',
  full_story: 'Historia completa',
  alternative_version: 'Versión alternativa',
  alternative_setting: 'Universo alternativo',
  spin_off: 'Derivada',
  other: 'Relacionada',
};
const chronological = (a, b) =>
  (a.metadata?.startDate || (a.year ? `${a.year}-99-99` : '9999')).localeCompare(
    b.metadata?.startDate || (b.year ? `${b.year}-99-99` : '9999'),
  ) || a.title.localeCompare(b.title);

export function orderSaga(items, relations, mode) {
  const sorted = [...items].sort(chronological);
  if (mode === 'release') return { items: sorted, cycle: false };
  const remaining = new Map(sorted.map((item) => [item.id, item]));
  const edges = relations
    .filter((edge) => ['prequel', 'sequel'].includes(edge.type))
    .map((edge) => (edge.type === 'prequel' ? [edge.to, edge.from] : [edge.from, edge.to]))
    .filter(([from, to]) => from !== to && remaining.has(from) && remaining.has(to));
  const ordered = [];
  while (remaining.size) {
    const next = [...remaining.values()].find(
      (item) => !edges.some(([from, to]) => to === item.id && remaining.has(from)),
    );
    if (!next) return { items: [...ordered, ...remaining.values()], cycle: true };
    ordered.push(next);
    remaining.delete(next.id);
  }
  return { items: ordered, cycle: false };
}
