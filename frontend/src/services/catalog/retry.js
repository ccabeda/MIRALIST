// Consume a refresh once, and never carry it over to another resource.
export function createRetryTracker() {
  let previousKey;
  let consumed = 0;
  return (key, attempt) => {
    const force = key === previousKey && attempt > consumed;
    previousKey = key;
    consumed = attempt;
    return force;
  };
}
