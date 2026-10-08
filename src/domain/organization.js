export function moveTitle(ids, movingId, targetId) {
  const from = ids.indexOf(movingId),
    to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, movingId);
  return next;
}

function normalizedName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}
const names = (title) =>
  [title.title, ...(Array.isArray(title.aliases) ? title.aliases : [])]
    .map(normalizedName)
    .filter(Boolean);
export function sameWork(a, b) {
  if (a.id && a.id === b.id) return true;
  if (a.category && b.category && a.category !== b.category) return false;
  const commonProviders = Object.keys(a.providerIds || {}).filter(
    (key) => b.providerIds?.[key] != null,
  );
  if (commonProviders.length)
    return commonProviders.every(
      (key) => String(a.providerIds[key]) === String(b.providerIds[key]),
    );
  // Alias explícitos y metadatos completos: nunca coincidencia aproximada por franquicia.
  if (
    !a.category ||
    !a.format ||
    !a.year ||
    !a.total ||
    ['category', 'format', 'year', 'total'].some((key) => a[key] !== b[key])
  )
    return false;
  return names(a).some((name) => names(b).includes(name));
}
export function canonicalTitle(candidate, catalog) {
  return (
    catalog.find((title) => title.id === candidate.id) ||
    catalog.find((title) => sameWork(title, candidate)) ||
    null
  );
}
export function matchesTitle(title, query) {
  const needle = normalizedName(query);
  return (
    !needle ||
    [...names(title), normalizedName(title.subtitle), normalizedName(title.genre)].some((name) =>
      name.includes(needle),
    )
  );
}

const fields = ['status', 'progress', 'seasonProgress'];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const progressState = (entry) => Object.fromEntries(fields.map((key) => [key, entry[key]]));
export function bulkUndo(beforeLibrary, afterLibrary, beforeFolders, afterFolders, label) {
  const entries = Object.keys(beforeLibrary)
    .filter(
      (id) =>
        afterLibrary[id] &&
        !equal(progressState(beforeLibrary[id]), progressState(afterLibrary[id])),
    )
    .map((id) => ({
      id,
      before: progressState(beforeLibrary[id]),
      after: progressState(afterLibrary[id]),
    }));
  const folders = beforeFolders.flatMap((before) => {
    const after = afterFolders.find((folder) => folder.id === before.id);
    if (!after) return [];
    const changed = [...new Set([...before.titleIds, ...after.titleIds])].filter(
      (id) => before.titleIds.includes(id) !== after.titleIds.includes(id),
    );
    return changed.length
      ? [{ id: before.id, before: before.titleIds, after: after.titleIds, changed }]
      : [];
  });
  return entries.length || folders.length ? { kind: 'bulk', entries, folders, label } : null;
}
export function restoreBulk(library, folders, action) {
  const nextLibrary = { ...library };
  let restored = 0,
    skipped = 0;
  for (const change of action.entries) {
    const current = library[change.id];
    if (!current || !equal(progressState(current), change.after)) {
      skipped++;
      continue;
    }
    const next = { ...current };
    for (const key of fields) {
      if (change.before[key] === undefined) delete next[key];
      else next[key] = change.before[key];
    }
    nextLibrary[change.id] = next;
    restored++;
  }
  const nextFolders = folders.map((folder) => {
    const change = action.folders.find((item) => item.id === folder.id);
    if (!change) return folder;
    let ids = [...folder.titleIds];
    for (const id of change.changed) {
      if (!Object.hasOwn(library, id) || ids.includes(id) !== change.after.includes(id)) {
        skipped++;
        continue;
      }
      if (!change.before.includes(id)) ids = ids.filter((value) => value !== id);
      else {
        const nextAnchor = change.before
          .slice(change.before.indexOf(id) + 1)
          .find((value) => ids.includes(value));
        ids.splice(nextAnchor ? ids.indexOf(nextAnchor) : ids.length, 0, id);
      }
      restored++;
    }
    return { ...folder, titleIds: ids };
  });
  skipped += action.folders.filter(
    (change) => !folders.some((folder) => folder.id === change.id),
  ).length;
  return { library: nextLibrary, folders: nextFolders, restored, skipped };
}
