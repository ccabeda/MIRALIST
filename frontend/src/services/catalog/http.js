const cache = new Map();
const pending = new Map();
const blockedUntil = new Map();

class CatalogError extends Error {
  constructor(message, code = 'network') {
    super(message);
    this.code = code;
  }
}

// Share requests across components, but never cache failures or keep an unbounded catalog.
export function cachedJson(
  url,
  { fetcher = fetch, ttl = 300000, force = false, priority = 'interactive' } = {},
) {
  const hit = cache.get(url);
  if (!force && hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
  // An interactive caller must reach the server to promote an already queued background request.
  const pendingKey = `${url}|${priority}`;
  if (pending.has(pendingKey)) return pending.get(pendingKey);
  const target = new URL(url, 'http://localhost');
  const provider = target.pathname.match(/^\/api\/catalog\/(mal|tmdb|schedule)(?:\/|$)/)?.[1];
  const origin = provider ? `${target.origin}/${provider}` : target.origin;
  const providerName =
    { mal: 'MyAnimeList', tmdb: 'TMDB', schedule: 'AnimeSchedule' }[provider] || 'el catálogo';
  const run = async () => {
    if ((blockedUntil.get(origin) || 0) > Date.now())
      throw new CatalogError(
        'El catálogo está recibiendo muchas consultas. Esperá un minuto y reintentá.',
        'rate-limit',
      );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), provider === 'mal' ? 75000 : 15000);
    try {
      const response = await fetcher(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'X-Catalog-Priority': priority },
      });
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After')) || 60;
        blockedUntil.set(origin, Date.now() + Math.max(1, seconds) * 1000);
        throw new CatalogError(
          'El catálogo alcanzó su límite de consultas. Esperá un minuto y reintentá.',
          'rate-limit',
        );
      }
      if (response.status === 503) {
        const body = await response.json().catch(() => ({}));
        if (body.error === 'MAL_BUSY')
          throw new CatalogError(
            'Hay otras consultas a MyAnimeList en curso. Reintentá en unos segundos.',
            'busy',
          );
        if (body.error === 'MAL_INVALID_CLIENT_ID')
          throw new CatalogError(
            'MyAnimeList rechazó la conexión. Revisá el Client ID configurado y reiniciá el servidor.',
            'configuration',
          );
        if (body.error === 'MAL_NOT_CONFIGURED')
          throw new CatalogError(
            'Falta activar la conexión con MyAnimeList. Tu biblioteca guardada sigue disponible.',
            'configuration',
          );
        throw new CatalogError(
          'El catálogo no está disponible todavía. Probá nuevamente más tarde.',
          'unavailable',
        );
      }
      if ([502, 504].includes(response.status)) {
        const body = await response.json().catch(() => ({}));
        if (response.status === 504 || body.error?.endsWith('_TIMEOUT'))
          throw new CatalogError(
            `La consulta a ${providerName} superó el tiempo de espera. Podés reintentar.`,
            'timeout',
          );
        if (body.error?.endsWith('_CONNECTION_FAILED'))
          throw new CatalogError(
            `El servidor no pudo conectarse con ${providerName}. Podés reintentar en unos momentos.`,
            'network',
          );
        if (body.error?.endsWith('_INVALID_RESPONSE'))
          throw new CatalogError(
            `${providerName} devolvió una respuesta que no pudimos leer. Podés reintentar.`,
            'invalid-response',
          );
        throw new CatalogError(
          `${providerName} respondió con un error. Podés reintentar en unos momentos.`,
          'unavailable',
        );
      }
      if (!response.ok)
        throw new CatalogError('No se pudo consultar el catálogo. Volvé a intentar.', 'http');
      const data = await response.json();
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(url, { data, expires: Date.now() + ttl });
      return data;
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      throw new CatalogError(
        ['AbortError', 'TimeoutError'].includes(error.name)
          ? 'La consulta tardó demasiado. Volvé a intentar.'
          : 'No se pudo conectar con el catálogo. Revisá tu conexión y reintentá.',
        ['AbortError', 'TimeoutError'].includes(error.name) ? 'timeout' : 'network',
      );
    } finally {
      clearTimeout(timer);
    }
  };
  const request = run();
  const tracked = request.finally(() => pending.delete(pendingKey));
  pending.set(pendingKey, tracked);
  return tracked;
}
