// Existing keys are part of the saved-data format. Keep them stable across refactors.
export const storageKeys = Object.freeze({
  library: 'miralist.demo.library.v1',
  folders: 'miralist.demo.folders.v1',
  preferences: 'miralist.library.preferences.v1',
  theme: 'miralist.theme',
  notifications: 'miralist.notifications.v1',
  profileName: 'miralist.profile-name.v1',
  demoBackup: 'miralist.before-demo-cleanup.v1',
  demoCleaned: 'miralist.demo-cleaned.v1',
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
