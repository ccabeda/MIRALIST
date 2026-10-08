import { normalizeEntry } from './entry-validation.js';
import { buildCatalog, normalizeTitle } from './catalog.js';
import { isRecord as record, safeId } from './entry-fields.js';
import { restoreFolder } from './folders.js';
import { canonicalTitle } from './organization.js';

export function makeBackup(library, folders, titles = []) {
  const catalog = buildCatalog(titles, library)
    .filter((title) => Object.hasOwn(library, title.id))
    .map(normalizeTitle);
  return {
    app: 'MiraList',
    version: 1,
    exportedAt: new Date().toISOString(),
    library,
    folders,
    catalog,
  };
}
export function readBackup(text, titles) {
  if (text.length > 5 * 1024 * 1024) throw new Error('La copia supera el límite de 5 MB.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no contiene JSON válido.');
  }
  if (
    !record(data) ||
    data.app !== 'MiraList' ||
    data.version !== 1 ||
    !record(data.library) ||
    !Array.isArray(data.folders)
  )
    throw new Error('No es una copia de MiráList compatible (versión 1).');
  if (
    data.catalog !== undefined &&
    (!Array.isArray(data.catalog) || data.catalog.some((item) => !record(item) || !safeId(item.id)))
  )
    throw new Error('El catálogo de la copia no es válido.');
  const library = {},
    idMap = new Map();
  let duplicateCount = 0;
  for (const [inputId, entry] of Object.entries(data.library)) {
    const metadata = data.catalog?.find((item) => item.id === inputId);
    const title =
      titles.find((title) => title.id === inputId) ||
      (metadata ? canonicalTitle(metadata, titles) || normalizeTitle(metadata) : null) ||
      normalizeTitle(entry?.catalog);
    if (!safeId(inputId) || !title)
      throw new Error(
        'La copia contiene obras que este catálogo todavía no reconoce. No se importó ningún dato.',
      );
    const id = title.id;
    idMap.set(inputId, id);
    const cleanEntry = normalizeEntry(entry, title);
    if (metadata || !titles.some((item) => item.id === id) || entry.catalog)
      cleanEntry.catalog = normalizeTitle(title);
    if (Object.hasOwn(library, id)) duplicateCount++;
    else library[id] = cleanEntry;
  }
  const ids = new Set(),
    names = new Set();
  const folders = data.folders.map((folder) => {
    if (
      !record(folder) ||
      !safeId(folder.id) ||
      ids.has(folder.id) ||
      typeof folder.name !== 'string' ||
      !folder.name.trim() ||
      folder.name.trim().length > 60 ||
      names.has(folder.name.trim().toLocaleLowerCase()) ||
      !Array.isArray(folder.titleIds) ||
      folder.titleIds.some((id) => !idMap.has(id))
    )
      throw new Error('La copia contiene carpetas inválidas o referencias a obras ausentes.');
    ids.add(folder.id);
    names.add(folder.name.trim().toLocaleLowerCase());
    return {
      id: folder.id,
      name: folder.name.trim(),
      titleIds: [...new Set(folder.titleIds.map((id) => idMap.get(id)))],
    };
  });
  return { library, folders, duplicateCount };
}
export function mergeBackup(currentLibrary, currentFolders, backup, useImported = false) {
  const library = useImported
    ? { ...currentLibrary, ...backup.library }
    : { ...backup.library, ...currentLibrary };
  let folders = currentFolders.map((folder) => ({ ...folder, titleIds: [...folder.titleIds] }));
  for (const incoming of backup.folders) {
    const match = folders.find((folder) => folder.id === incoming.id);
    if (match) match.titleIds = [...new Set([...match.titleIds, ...incoming.titleIds])];
    else folders = restoreFolder(folders, incoming, library);
  }
  return { library, folders };
}
