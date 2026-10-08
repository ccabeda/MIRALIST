export const notificationTitleKey = (title) =>
  title.providerIds?.mal
    ? `mal-${title.providerIds.mal}`
    : title.providerIds?.tmdb
      ? `tmdb-${title.category}-${title.providerIds.tmdb}`
      : title.id;

export const emptyNotifications = () => ({ items: [], seen: [], relations: {}, checkedAt: null });

export function parseNotifications(raw) {
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      !Array.isArray(value.items) ||
      !Array.isArray(value.seen) ||
      !value.relations ||
      typeof value.relations !== 'object' ||
      Array.isArray(value.relations)
    )
      return emptyNotifications();
    return {
      items: value.items
        .filter(
          (item) =>
            typeof item?.id === 'string' &&
            typeof item.message === 'string' &&
            typeof item.title?.title === 'string' &&
            typeof item.title.id === 'string' &&
            Number.isFinite(Date.parse(item.date)),
        )
        .slice(0, 100)
        .map((item) => ({ ...item, read: !!item.read })),
      seen: value.seen.filter((id) => typeof id === 'string').slice(-2000),
      relations: Object.fromEntries(
        Object.entries(value.relations)
          .filter(([, ids]) => Array.isArray(ids))
          .map(([key, ids]) => [key, ids.filter((id) => typeof id === 'string')]),
      ),
      checkedAt: Number.isFinite(Date.parse(value.checkedAt)) ? value.checkedAt : null,
    };
  } catch {
    return emptyNotifications();
  }
}

export function mergeNotifications(previous, updates, savedKeys, now = new Date()) {
  const next = {
    ...previous,
    items: [...previous.items],
    relations: { ...previous.relations },
    checkedAt: now.toISOString(),
  };
  const seen = new Set([...previous.seen, ...previous.items.map((item) => item.id)]);
  function add(item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    next.items.push({ ...item, read: false });
  }
  for (const update of updates) {
    const key = notificationTitleKey(update.title);
    for (const episode of update.episodes || []) {
      const time = Date.parse(episode.date);
      if (!Number.isFinite(time) || time > now.getTime() || time < now.getTime() - 7 * 86400000)
        continue;
      add({
        id: `episode:${key}:${episode.season || 0}:${episode.episode}`,
        title: update.title,
        date: episode.date,
        source: episode.source,
        message:
          episode.source === 'TMDB'
            ? `Estreno del episodio ${episode.episode}, temporada ${episode.season}, de ${update.title.title}.`
            : `Se emitió el episodio ${episode.episode} de ${update.title.title} en Japón.`,
      });
    }
    if (!update.related) continue; // A failed request must not erase the baseline.
    const baseline = previous.relations[key];
    const relatedKeys = update.related.map(notificationTitleKey);
    if (baseline)
      for (const title of update.related) {
        const relatedKey = notificationTitleKey(title);
        if (!baseline.includes(relatedKey) && !savedKeys.has(relatedKey))
          add({
            id: `related:${relatedKey}`,
            title,
            date: now.toISOString(),
            source: 'MyAnimeList',
            message: `Nueva entrega detectada: ${title.title}. Relacionada con ${update.title.title}.`,
          });
      }
    next.relations[key] = [...new Set([...(baseline || []), ...relatedKeys])];
  }
  next.items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  next.items = next.items.slice(0, 100);
  next.seen = [...seen].slice(-2000);
  return next;
}

export function relativeNotificationDate(date, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(date)) / 1000));
  if (seconds < 60) return 'Ahora';
  const [amount, unit] =
    seconds < 3600
      ? [Math.floor(seconds / 60), 'minute']
      : seconds < 86400
        ? [Math.floor(seconds / 3600), 'hour']
        : [Math.floor(seconds / 86400), 'day'];
  return new Intl.RelativeTimeFormat('es', { numeric: 'always' }).format(-amount, unit);
}
