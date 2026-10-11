import { catalogFailure } from './catalog-failure.js';

// These are conservative app limits, not official MyAnimeList quotas.
export function createMalClient({
  clientId,
  fetcher,
  interval = 1000,
  ttl = 300000,
  maxEntries = 200,
  maxWait = 60000,
  now = Date.now,
}) {
  const cache = new Map();
  const pending = new Map();
  const queue = [];
  let running = false;
  let nextStart = 0;
  let blockedUntil = 0;

  const limited = () => ({
    status: 429,
    body: { error: 'MAL_UNAVAILABLE' },
    retryAfter: String(Math.max(1, Math.ceil((blockedUntil - now()) / 1000))),
  });

  async function pump() {
    if (running) return;
    running = true;
    while (queue.length) {
      const delay = nextStart - now();
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      // Prefer explicit searches/details; old background work eventually gets a turn.
      queue.sort(
        (a, b) =>
          Number(b.priority === 'interactive' || now() - b.created >= 30000) -
          Number(a.priority === 'interactive' || now() - a.created >= 30000),
      );
      const job = queue.shift();
      if (!job) break;
      clearTimeout(job.timer);
      if (blockedUntil > now()) {
        job.resolve(limited());
        continue;
      }
      nextStart = now() + interval;
      let result;
      try {
        const response = await fetcher(job.url, {
          headers: { 'X-MAL-CLIENT-ID': clientId.trim(), Accept: 'application/json' },
          signal: AbortSignal.timeout(12000),
        });
        if (response.ok) {
          result = { status: 200, body: await response.json() };
          if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
          cache.set(job.url, { result, expires: now() + ttl });
        } else if (response.status === 429) {
          const header = response.headers.get('Retry-After');
          const seconds = Number(header);
          const until =
            header && Number.isFinite(seconds)
              ? now() + Math.max(1, seconds) * 1000
              : Date.parse(header);
          blockedUntil = Number.isFinite(until) ? Math.max(now() + 1000, until) : now() + 60000;
          result = limited();
        } else {
          result = [401, 403].includes(response.status)
            ? { status: 503, body: { error: 'MAL_INVALID_CLIENT_ID' } }
            : { status: 502, body: { error: 'MAL_UNAVAILABLE' } };
        }
      } catch (error) {
        const failure = catalogFailure(error, 'MAL');
        result = { status: failure.status, body: { error: failure.error } };
      }
      job.resolve(result);
    }
    running = false;
  }

  return (target, priority = 'interactive') => {
    const url = String(target);
    const hit = cache.get(url);
    if (hit?.expires > now()) return Promise.resolve(hit.result);
    cache.delete(url);
    if (pending.has(url)) {
      const queued = queue.find((job) => job.url === url);
      if (queued && priority === 'interactive') queued.priority = priority;
      return pending.get(url);
    }
    if (blockedUntil > now()) return Promise.resolve(limited());
    if (queue.length >= 20) return Promise.resolve({ status: 503, body: { error: 'MAL_BUSY' } });
    const task = new Promise((resolve) => {
      const job = { url, resolve, priority, created: now() };
      job.timer = setTimeout(() => {
        const index = queue.indexOf(job);
        if (index < 0) return;
        queue.splice(index, 1);
        resolve({ status: 503, body: { error: 'MAL_BUSY' } });
      }, maxWait);
      queue.push(job);
    }).finally(() => pending.delete(url));
    pending.set(url, task);
    void pump();
    return task;
  };
}
