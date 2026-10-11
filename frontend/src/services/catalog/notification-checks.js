export function createNotificationChecks(saved = {}, now = Date.now) {
  const checks = new Map(
    Object.entries(saved || {}).filter(
      ([, item]) => item && Number.isFinite(item.at) && item.at <= now(),
    ),
  );
  return {
    due(key, force = false) {
      const last = checks.get(key);
      return force || !last || now() - last.at >= (last.failed ? 60000 : 900000);
    },
    record(key, failed) {
      checks.set(key, { at: now(), failed: !!failed });
    },
    prune(keys) {
      for (const key of checks.keys()) if (!keys.has(key)) checks.delete(key);
    },
    snapshot() {
      return Object.fromEntries(checks);
    },
  };
}
