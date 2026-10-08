import { statuses } from './library.js';
import { applyEntryPatch } from './entry-updates.js';

export function bulkStatus(library, titles, ids, status) {
  if (!statuses.includes(status)) return library;
  const next = { ...library };
  for (const id of new Set(ids)) {
    const title = titles.find((item) => item.id === id);
    if (!title || !Object.hasOwn(library, id)) continue;
    const entry = library[id];
    next[id] = applyEntryPatch(title, entry, { status });
  }
  return next;
}
export function bulkFolders(folders, ids, destination, move = false) {
  if (!folders.some((folder) => folder.id === destination)) return folders;
  const chosen = new Set(ids);
  return folders.map((folder) => ({
    ...folder,
    titleIds:
      folder.id === destination
        ? [...new Set([...folder.titleIds, ...chosen])]
        : move
          ? folder.titleIds.filter((id) => !chosen.has(id))
          : folder.titleIds,
  }));
}
