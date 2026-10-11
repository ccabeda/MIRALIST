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
  'nsfw',
].join(',');

// Only public catalog reads; user lists and OAuth credentials are not involved.
export async function handleMalRequest(url, res, send, { clientId, request, priority }) {
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
    // MAL also hides non-explicit "gray" titles when this is false.
    target.searchParams.set('nsfw', 'true');
  }
  const result = await request(target, priority);
  if (result.retryAfter) res.setHeader('Retry-After', result.retryAfter);
  if (!id && result.status === 200 && Array.isArray(result.body.data))
    return send(res, 200, {
      ...result.body,
      data: result.body.data.filter(({ node }) => node?.nsfw !== 'black'),
    });
  return send(res, result.status, result.body);
}
