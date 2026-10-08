import legacyNames from '../data/legacy-title-names.json' with { type: 'json' };
import { recoverLibrary } from '../domain/library-recovery.js';
import { makeBackup } from '../domain/backup.js';
import { parseFolders } from '../domain/folders.js';
import { readStorage, writeStorage, storageKeys } from './storage.js';

export function loadSavedLibrary(availableTitles = [], storage) {
  const library = recoverLibrary(readStorage(storageKeys.library, storage), availableTitles);
  if (readStorage(storageKeys.demoCleaned, storage) === 'true') return library;
  const entries = Object.entries(library);
  const realEntries = entries.filter(
    ([id, entry]) =>
      !Object.hasOwn(legacyNames, id) ||
      entry.catalog?.providerIds?.mal ||
      entry.catalog?.providerIds?.tmdb,
  );
  if (realEntries.length !== entries.length) {
    const folders = parseFolders(readStorage(storageKeys.folders, storage), library);
    // Keep an importable copy before removing examples, including edited ones.
    if (
      !readStorage(storageKeys.demoBackup, storage) &&
      !writeStorage(storageKeys.demoBackup, JSON.stringify(makeBackup(library, folders)), storage)
    )
      return library;
    const cleaned = Object.fromEntries(realEntries);
    if (!writeStorage(storageKeys.library, JSON.stringify(cleaned), storage)) return library;
    writeStorage(storageKeys.demoCleaned, 'true', storage);
    return cleaned;
  }
  writeStorage(storageKeys.demoCleaned, 'true', storage);
  return library;
}
