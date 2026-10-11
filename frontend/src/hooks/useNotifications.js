import { useEffect, useRef, useState } from 'react';
import { readStorage, writeStorage, storageKeys } from '../services/storage.js';
import {
  parseNotifications,
  mergeNotifications,
  notificationTitleKey,
} from '../domain/notifications.js';
import { loadNotificationUpdate, notificationTitles } from '../services/catalog/notifications.js';
import { loadInBatches } from '../services/catalog/discovery.js';
import { createRetryTracker } from '../services/catalog/retry.js';
import { createNotificationChecks } from '../services/catalog/notification-checks.js';

export default function useNotifications(titles, library, userId, onEpisodeUpdate) {
  const notificationKey = userId
    ? `${storageKeys.notifications}.${userId}`
    : storageKeys.notifications;
  const [state, setState] = useState(() => parseNotifications(readStorage(notificationKey)));
  const [attempt, setAttempt] = useState(0);
  const retryTracker = useRef(createRetryTracker());
  const checks = useRef(null);
  if (!checks.current) {
    let saved;
    try {
      saved = JSON.parse(readStorage(`${notificationKey}.checks`) || '{}');
    } catch {
      saved = {};
    }
    checks.current = createNotificationChecks(saved);
  }
  const [tick, setTick] = useState(0);
  const running = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!running.current) setTick((value) => value + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef({ titles, library, onEpisodeUpdate });
  latest.current = { titles, library, onEpisodeUpdate };
  const key = JSON.stringify(notificationTitles(titles, library).map(notificationTitleKey).sort());
  useEffect(() => {
    let active = true;
    const force = retryTracker.current(userId, attempt);
    const options = { force, refreshAt: Date.now(), priority: 'background' };
    const { titles: currentTitles, library: currentLibrary } = latest.current;
    const all = notificationTitles(currentTitles, currentLibrary);
    const savedKeys = new Set(all.map(notificationTitleKey));
    checks.current.prune(savedKeys);
    const selected = all.filter((title) => checks.current.due(notificationTitleKey(title), force));
    running.current = true;
    setBusy(true);
    loadInBatches(
      selected,
      async (title) => {
        const update = await loadNotificationUpdate(title, currentLibrary[title.id], options);
        if (active) {
          latest.current.onEpisodeUpdate?.(update);
          // Commit each completed title so adding another work does not restart the whole library.
          checks.current.record(notificationTitleKey(title), update.errors > 0);
          setState((previous) => mergeNotifications(previous, [update], savedKeys));
          writeStorage(`${notificationKey}.checks`, JSON.stringify(checks.current.snapshot()));
        }
        return update;
      },
      () => active,
    ).then((results) => {
      if (!active) return;
      const updates = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const savedKeys = new Set(
        latest.current.titles
          .filter((title) => latest.current.library[title.id])
          .map(notificationTitleKey),
      );
      setState((previous) => mergeNotifications(previous, updates, savedKeys));
      setErrors(
        results.filter((result) => result.status === 'rejected').length +
          updates.reduce((sum, update) => sum + update.errors, 0),
      );
      setBusy(false);
      running.current = false;
    });
    return () => {
      active = false;
      running.current = false;
    };
  }, [key, attempt, tick, userId, notificationKey]);
  useEffect(() => {
    setSaveFailed(!writeStorage(notificationKey, JSON.stringify(state)));
  }, [state, notificationKey]);
  function markRead(id) {
    setState((previous) => ({
      ...previous,
      items: previous.items.map((item) => (!id || item.id === id ? { ...item, read: true } : item)),
    }));
  }
  return {
    ...state,
    busy,
    errors,
    saveFailed,
    markRead,
    refresh: () => setAttempt((value) => value + 1),
  };
}
