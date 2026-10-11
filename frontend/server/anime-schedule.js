// The timetable is shared between followed titles; only MAL matches are returned to the client.
export function isoWeek(date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const year = day.getUTCFullYear();
  return { year, week: Math.ceil(((day - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7) };
}

const validDate = (value) =>
  typeof value === 'string' && !value.startsWith('0001-') && Number.isFinite(Date.parse(value));

export function nextEpisode(rows, route, now = Date.now()) {
  return upcomingEpisodes(rows, route, now)[0] || null;
}

export function upcomingEpisodes(rows, route, now = Date.now()) {
  const episodes = rows
    .filter((row) => row.route === route && row.airType === 'raw')
    .map((row) => {
      const delayed = row.status === 'Delayed' || row.airingStatus === 'delayed-air';
      const date = delayed ? row.delayedUntil : row.episodeDate;
      return { date: validDate(date) ? date : null, episode: row.episodeNumber, delayed };
    })
    .filter(
      (row) =>
        row.date && Date.parse(row.date) > now && Number.isInteger(row.episode) && row.episode > 0,
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return [
    ...new Map(episodes.map((episode) => [`${episode.episode}:${episode.date}`, episode])).values(),
  ];
}

export function recentEpisodes(rows, route, now = Date.now()) {
  const episodes = new Map();
  for (const row of rows) {
    const time = Date.parse(row.episodeDate);
    if (
      row.route !== route ||
      row.airType !== 'raw' ||
      row.airingStatus !== 'aired' ||
      !Number.isFinite(time) ||
      time > now ||
      time < now - 7 * 86400000 ||
      !Number.isInteger(row.episodeNumber) ||
      row.episodeNumber < 1
    )
      continue;
    episodes.set(row.episodeNumber, { episode: row.episodeNumber, date: row.episodeDate });
  }
  return [...episodes.values()];
}

export function createAnimeSchedule({ token = '', fetcher = fetch, now = () => Date.now() } = {}) {
  const cache = new Map();
  const pending = new Map();
  let blockedUntil = 0;
  async function request(path, refreshAfter = 0) {
    const hit = cache.get(path);
    if (hit?.expires > now() && hit.storedAt >= refreshAfter) return hit.data;
    if (pending.has(path)) return pending.get(path);
    const task = (async () => {
      if (blockedUntil > now()) throw Object.assign(new Error(), { status: 429 });
      const response = await fetcher(`https://animeschedule.net/api/v3/${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        if (response.status === 429) blockedUntil = now() + 60000;
        throw Object.assign(new Error(), { status: response.status });
      }
      const data = await response.json();
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(path, { data, storedAt: now(), expires: now() + 300000 });
      return data;
    })();
    pending.set(path, task);
    try {
      return await task;
    } finally {
      pending.delete(path);
    }
  }
  return async (url, res, send) => {
    const id = url.searchParams.get('malId');
    const requestedRefresh = Number(url.searchParams.get('refresh')) || 0;
    const refreshAfter = Math.min(Math.max(0, requestedRefresh), now());
    if (!/^[1-9]\d{0,9}$/.test(id || '')) return send(res, 400, { error: 'Invalid anime ID' });
    if (!token.trim()) return send(res, 503, { error: 'ANIMESCHEDULE_NOT_CONFIGURED' });
    try {
      const matches = await request(`anime?mal-ids=${id}`, refreshAfter);
      const anime = matches.anime?.find((item) => {
        const match = item.websites?.mal?.match(/(?:^|\/)myanimelist\.net\/anime\/(\d+)(?:\/|$)/);
        return match?.[1] === id;
      });
      if (!anime) return send(res, 200, { matched: false, next: null });
      const weeks = [-7, 0, 7].map((offset) => isoWeek(new Date(now() + offset * 86400000)));
      const rows = await Promise.all(
        weeks.map(({ year, week }) =>
          request(`timetables/raw?year=${year}&week=${week}`, refreshAfter),
        ),
      );
      if (!rows.every(Array.isArray)) throw new Error('Invalid timetable');
      const next = nextEpisode(rows.flat(), anime.route, now());
      send(res, 200, {
        matched: true,
        next,
        upcoming: upcomingEpisodes(rows.flat(), anime.route, now()),
        recent: recentEpisodes(rows.flat(), anime.route, now()),
        delayed: anime.status === 'Delayed',
        source: 'AnimeSchedule',
      });
    } catch (error) {
      if (error.status === 429) res.setHeader('Retry-After', '60');
      send(res, error.status === 429 ? 429 : 502, { error: 'ANIMESCHEDULE_UNAVAILABLE' });
    }
  };
}
