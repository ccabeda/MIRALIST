export function addTitleToFolders(folders, titleId, folderIds) {
  return folders.map((folder) =>
    folderIds.includes(folder.id) && !folder.titleIds.includes(titleId)
      ? { ...folder, titleIds: [...folder.titleIds, titleId] }
      : folder,
  );
}

export function parseFolders(raw, library) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = new Set();
    return parsed
      .filter((folder) => {
        if (
          !folder ||
          typeof folder.id !== 'string' ||
          ids.has(folder.id) ||
          typeof folder.name !== 'string' ||
          !folder.name.trim() ||
          !Array.isArray(folder.titleIds)
        )
          return false;
        ids.add(folder.id);
        return true;
      })
      .map((folder) => ({
        id: folder.id,
        name: folder.name.trim().slice(0, 60),
        titleIds: [
          ...new Set(
            folder.titleIds.filter((id) => typeof id === 'string' && Object.hasOwn(library, id)),
          ),
        ],
      }));
  } catch {
    return [];
  }
}

export function validateFolderName(name, folders, editedId) {
  const cleaned = name.trim();
  if (!cleaned) return 'Poné un nombre para tu carpeta.';
  if (cleaned.length > 60) return 'Usá un nombre de hasta 60 caracteres.';
  if (
    folders.some(
      (folder) =>
        folder.id !== editedId &&
        folder.name.toLocaleLowerCase('es') === cleaned.toLocaleLowerCase('es'),
    )
  )
    return 'Ya tenés una carpeta con ese nombre.';
  return '';
}

export function restoreFolder(folders, removed, library) {
  if (folders.some((folder) => folder.id === removed.id)) return folders;
  let name = removed.name;
  let suffix = 2;
  while (folders.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase()))
    name = `${removed.name.slice(0, 45)} (${suffix++})`;
  return [
    ...folders,
    { ...removed, name, titleIds: removed.titleIds.filter((id) => Object.hasOwn(library, id)) },
  ];
}
