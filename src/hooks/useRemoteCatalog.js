import { useEffect, useState } from 'react';
import { catalogConfiguration, searchCatalog } from '../services/catalog/providers.js';

export default function useRemoteCatalog({ category, query, format, page, onTitles }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const key = JSON.stringify([category, query.trim(), format, page, attempt]);
  const idle = query.trim().length < 3;
  useEffect(() => {
    if (idle) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        {
          const config = await catalogConfiguration({ force: attempt > 0 });
          if (!(category === 'Anime' ? config.mal : config.tmdb)) {
            if (active) setResult({ key, items: [], configured: false });
            return;
          }
        }
        const data = await searchCatalog({ category, query, format, page }, { force: attempt > 0 });
        if (!active) return;
        onTitles(data.items);
        setResult({ ...data, key, configured: true });
      } catch (error) {
        if (active) setResult({ key, items: [], error: error.message, configured: true });
      }
    }, 400);
    // A finished older search must never replace a newer page or filter.
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, idle, category, query, format, page, onTitles, attempt]);
  const current = !idle && result?.key === key ? result : null;
  return {
    items: [],
    ...current,
    idle,
    loading: !idle && !current,
    retry: () => setAttempt((value) => value + 1),
  };
}
