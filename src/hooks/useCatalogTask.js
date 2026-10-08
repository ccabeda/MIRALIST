import { useEffect, useRef, useState } from 'react';

// The key describes remote inputs; the task uses the latest local snapshot.
// Updating display metadata must not restart the same remote request.
export default function useCatalogTask(key, task) {
  const latest = useRef(task);
  latest.current = task;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => latest.current(() => active, { force: attempt > 0, refreshAt: Date.now() }))
      .then(
        (data) => {
          if (active) setState({ key, attempt, data });
        },
        () => {
          if (active) setState({ key, attempt, data: { errors: 1 } });
        },
      );
    return () => {
      active = false;
    };
  }, [key, attempt]);
  return {
    result: state?.key === key && state?.attempt === attempt ? state.data : null,
    refresh: () => setAttempt((value) => value + 1),
  };
}
