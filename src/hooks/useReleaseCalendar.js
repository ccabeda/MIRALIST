import { useEffect, useRef, useState } from 'react';
import { calendarTitles, calendarEvents } from '../domain/release-calendar.js';
import { loadInBatches } from '../services/catalog/discovery.js';
import { loadTitle } from '../services/catalog/providers.js';
import { loadAnimeSchedule } from '../services/catalog/schedule.js';

export default function useReleaseCalendar(titles, library) {
  const selected = calendarTitles(titles, library);
  const latest = useRef(selected);
  latest.current = selected;
  const key = JSON.stringify(selected.map((title) => title.id).sort());
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    const options = { force: attempt > 0, refreshAt: Date.now() };
    loadInBatches(
      latest.current,
      async (title) => {
        if (title.providerIds?.mal)
          return calendarEvents(title, await loadAnimeSchedule(title, options));
        return calendarEvents((await loadTitle(title, options)).title);
      },
      () => active,
    ).then((outcomes) => {
      if (active)
        setResult({
          key,
          attempt,
          events: outcomes
            .filter((item) => item.status === 'fulfilled')
            .flatMap((item) => item.value),
          errors: outcomes.filter((item) => item.status === 'rejected').length,
        });
    });
    return () => {
      active = false;
    };
  }, [key, attempt]);
  const current = result?.key === key && result?.attempt === attempt ? result : null;
  return {
    events: current?.events || [],
    errors: current?.errors || 0,
    loading: !current,
    total: selected.length,
    refresh: () => setAttempt((value) => value + 1),
  };
}
