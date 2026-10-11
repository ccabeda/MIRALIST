// Existing keys are part of the saved-data format. Keep them stable across refactors.
export const storageKeys = Object.freeze({
  preferences: 'miralist.library.preferences.v1',
  theme: 'miralist.theme',
  notifications: 'miralist.notifications.v1',
});

export function readStorage(key, storage) {
  try {
    return (storage ?? globalThis.localStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key, value, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
