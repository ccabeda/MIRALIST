import { handleMalRequest } from './mal-api.js';
import { createAnimeSchedule } from './anime-schedule.js';

export function createCatalogApi({
  token = '',
  malClientId = '',
  animeScheduleToken = '',
  fetcher = fetch,
} = {}) {
  const schedule = createAnimeSchedule({ token: animeScheduleToken, fetcher });
  const send = (res, status, data) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(data));
  };
  return async (req, res, next = () => send(res, 404, { error: 'Not found' })) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/catalog/')) return next();
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    if (url.pathname === '/api/catalog/config')
      return send(res, 200, { tmdb: !!token.trim(), mal: !!malClientId.trim() });
    if (url.pathname === '/api/catalog/mal')
      return handleMalRequest(url, res, send, { clientId: malClientId, fetcher });
    if (url.pathname === '/api/catalog/schedule') return schedule(url, res, send);
    if (url.pathname !== '/api/catalog/tmdb') return send(res, 404, { error: 'Not found' });
    if (!token.trim()) return send(res, 503, { error: 'TMDB_NOT_CONFIGURED' });
    const kind = url.searchParams.get('kind');
    const id = url.searchParams.get('id');
    const query = (url.searchParams.get('query') || '').trim();
    const page = Number(url.searchParams.get('page') || 1);
    if (
      !['tv', 'movie', 'collection'].includes(kind) ||
      (kind === 'collection' && !id) ||
      (id !== null && !/^[1-9]\d{0,9}$/.test(id)) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 500 ||
      query.length > 200
    )
      return send(res, 400, { error: 'Invalid catalog query' });
    const path = id ? `${kind}/${id}` : query ? `search/${kind}` : `${kind}/popular`;
    const target = new URL(`https://api.themoviedb.org/3/${path}`);
    target.searchParams.set('language', 'es-ES');
    if (id && kind !== 'collection')
      target.searchParams.set('append_to_response', 'recommendations');
    else if (!id) {
      target.searchParams.set('page', page);
      target.searchParams.set('include_adult', 'false');
      if (query) target.searchParams.set('query', query);
    }
    try {
      const response = await fetcher(target, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        if (response.status === 429)
          res.setHeader('Retry-After', response.headers.get('Retry-After') || '60');
        return send(res, response.status === 429 ? 429 : 502, { error: 'TMDB_UNAVAILABLE' });
      }
      send(res, 200, await response.json());
    } catch {
      send(res, 502, { error: 'TMDB_UNAVAILABLE' });
    }
  };
}
