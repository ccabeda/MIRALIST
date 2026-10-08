import legacyNames from '../data/legacy-title-names.json' with { type: 'json' };
import { normalizeTitle, buildCatalog } from './catalog.js';
import { parseLibrary } from './library.js';
import { migrateMovieDates } from './watch-dates.js';

// Older saved entries predate catalog snapshots. Recover their names only when
// already present in storage; never populate a new library or the search catalog.
export function recoverLibrary(raw, availableTitles = []) {
  const library = parseLibrary(raw, {}, availableTitles);
  for (const [id, entry] of Object.entries(library)) {
    if (!entry.catalog && Object.hasOwn(legacyNames, id)) {
      entry.catalog = normalizeTitle({ id, ...legacyNames[id] });
    }
  }
  return migrateMovieDates(library, buildCatalog(availableTitles, library));
}
