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
export function cachedJson(url, { fetcher = fetch, ttl = 300000, force = false } = {}) {
  const hit = cache.get(url);
  if (!force && hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
  if (pending.has(url)) return pending.get(url);
  const target = new URL(url, 'http://localhost');
  const provider = target.pathname.match(/^\/api\/catalog\/(mal|tmdb|schedule)(?:\/|$)/)?.[1];
  const origin = provider ? `${target.origin}/${provider}` : target.origin;
  const run = async () => {
    if ((blockedUntil.get(origin) || 0) > Date.now())
      throw new CatalogError(
        'El catálogo está recibiendo muchas consultas. Esperá un minuto y reintentá.',
        'rate-limit',
      );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
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
      if (!response.ok)
        throw new CatalogError('No se pudo consultar el catálogo. Volvé a intentar.', 'http');
      const data = await response.json();
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(url, { data, expires: Date.now() + ttl });
      return data;
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      throw new CatalogError(
        error.name === 'AbortError'
          ? 'La consulta tardó demasiado. Volvé a intentar.'
          : 'No se pudo conectar con el catálogo. Revisá tu conexión y reintentá.',
      );
    } finally {
      clearTimeout(timer);
    }
  };
  const request = run();
  const tracked = request.finally(() => pending.delete(url));
  pending.set(url, tracked);
  return tracked;
}
