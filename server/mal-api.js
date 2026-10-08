const summaryFields = [
  'alternative_titles',
  'start_date',
  'end_date',
  'synopsis',
  'mean',
  'num_list_users',
  'media_type',
  'status',
  'genres',
  'num_episodes',
  'start_season',
  'source',
  'average_episode_duration',
  'studios',
  'broadcast',
].join(',');

// Only public catalog reads; user lists and OAuth credentials are not involved.
export async function handleMalRequest(url, res, send, { clientId, fetcher }) {
  if (!clientId.trim()) return send(res, 503, { error: 'MAL_NOT_CONFIGURED' });
  const id = url.searchParams.get('id');
  const query = (url.searchParams.get('query') || '').trim();
  const page = Number(url.searchParams.get('page') || 1);
  if (
    (id !== null && !/^[1-9]\d{0,9}$/.test(id)) ||
    (!id && (query.length < 3 || query.length > 200)) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 500
  )
    return send(res, 400, { error: 'Invalid catalog query' });

  const target = new URL(`https://api.myanimelist.net/v2/anime${id ? `/${id}` : ''}`);
  target.searchParams.set(
    'fields',
    id ? `${summaryFields},related_anime,recommendations` : summaryFields,
  );
  if (!id) {
    target.searchParams.set('q', query);
    target.searchParams.set('limit', '24');
    target.searchParams.set('offset', String((page - 1) * 24));
    target.searchParams.set('nsfw', 'false');
  }
  try {
    const response = await fetcher(target, {
      headers: { 'X-MAL-CLIENT-ID': clientId.trim(), Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      if ([401, 403].includes(response.status))
        return send(res, 503, { error: 'MAL_INVALID_CLIENT_ID' });
      if (response.status === 429)
        res.setHeader('Retry-After', response.headers.get('Retry-After') || '60');
      return send(res, response.status === 429 ? 429 : 502, { error: 'MAL_UNAVAILABLE' });
    }
    return send(res, 200, await response.json());
  } catch {
    return send(res, 502, { error: 'MAL_UNAVAILABLE' });
  }
}
