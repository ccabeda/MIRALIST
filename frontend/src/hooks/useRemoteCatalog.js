import { createRetryTracker } from '../services/catalog/retry.js';
import { useEffect, useRef, useState } from 'react';
import { catalogConfiguration, searchCatalog } from '../services/catalog/providers.js';

export default function useRemoteCatalog({ category, query, format, page, order, onTitles }) {
  const [attempt, setAttempt] = useState(0);
  const retryTracker = useRef(createRetryTracker());
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const key = JSON.stringify([category, query.trim(), format, page, order, attempt]);
  const idle = query.trim().length < 3;
  useEffect(() => {
    if (idle) return;
    let active = true;
    const timer = setTimeout(async () => {
      const force = retryTracker.current(
        JSON.stringify([category, query.trim(), format, page, order]),
        attempt,
      );
      try {
        {
          const config = await catalogConfiguration({ force });
          if (!(category === 'Anime' ? config.mal : config.tmdb)) {
            if (active) setResult({ key, items: [], configured: false });
            return;
          }
        }
        if (!active) return;
        const data = await searchCatalog(
          { category, query, format, page, order },
          {
            force,
            isActive: () => active,
            onProgress: (pages) => {
              if (active) setProgress({ key, pages });
            },
          },
        );
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
  }, [key, idle, category, query, format, page, order, onTitles, attempt]);
  const current = !idle && result?.key === key ? result : null;
  return {
    items: [],
    ...current,
    idle,
    loading: !idle && !current,
    pagesLoaded: progress?.key === key ? progress.pages : 0,
    retry: () => setAttempt((value) => value + 1),
  };
}
