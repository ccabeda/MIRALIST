import { useEffect, useRef, useState } from 'react';
import { readStorage, writeStorage, storageKeys } from '../services/storage.js';
import {
  parseNotifications,
  mergeNotifications,
  notificationTitleKey,
} from '../domain/notifications.js';
import { loadNotificationUpdate, notificationTitles } from '../services/catalog/notifications.js';
import { loadInBatches } from '../services/catalog/discovery.js';

export default function useNotifications(titles, library) {
  const [state, setState] = useState(() =>
    parseNotifications(readStorage(storageKeys.notifications)),
  );
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef({ titles, library });
  latest.current = { titles, library };
  const key = JSON.stringify(
    notificationTitles(titles, library)
      .map((title) => [notificationTitleKey(title), library[title.id].status])
      .sort(),
  );
  useEffect(() => {
    let active = true;
    const options = { force: attempt > 0, refreshAt: Date.now() };
    const { titles: currentTitles, library: currentLibrary } = latest.current;
    const selected = notificationTitles(currentTitles, currentLibrary);
    setBusy(true);
    loadInBatches(
      selected,
      (title) => loadNotificationUpdate(title, currentLibrary[title.id], options),
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
    });
    return () => {
      active = false;
    };
  }, [key, attempt]);
  useEffect(() => {
    setSaveFailed(!writeStorage(storageKeys.notifications, JSON.stringify(state)));
  }, [state]);
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
