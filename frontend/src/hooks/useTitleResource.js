import { createRetryTracker } from '../services/catalog/retry.js';
import { useEffect, useRef, useState } from 'react';
import { loadTitle } from '../services/catalog/providers.js';

export default function useTitleResource(selected, onTitles) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retryTracker = useRef(createRetryTracker());
  const id = selected?.id;
  const remote = !!(selected?.providerIds?.mal || selected?.providerIds?.tmdb);
  useEffect(() => {
    if (!id || !remote) return;
    let active = true;
    loadTitle(selected, { force: retryTracker.current(id, attempt) })
      .then((data) => {
        if (!active) return;
        onTitles([data.title, ...data.related, ...(data.recommendations || [])]);
        setResult({ id, attempt, ...data });
      })
      .catch((error) => {
        if (active) setResult({ id, attempt, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [id, remote, selected, attempt, onTitles]);
  const current = result?.id === id && result?.attempt === attempt ? result : null;
  return {
    title: current?.title || selected,
    related: current?.related,
    relations: current?.relations,
    recommendations: current?.recommendations,
    loading: remote && !current,
    error: current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
