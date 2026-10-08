import { storageKeys, readStorage, writeStorage } from '../services/storage.js';
import { useEffect, useState } from 'react';
import { parseFolders } from '../domain/folders.js';

export default function useFolders(library, notify) {
  const [folders, setFolders] = useState(() => {
    try {
      return parseFolders(readStorage(storageKeys.folders), library);
    } catch {
      return [];
    }
  });
  useEffect(() => {
    setFolders((current) => {
      const cleaned = current.map((folder) => ({
        ...folder,
        titleIds: folder.titleIds.filter((id) => Object.hasOwn(library, id)),
      }));
      return cleaned.some(
        (folder, index) => folder.titleIds.length !== current[index].titleIds.length,
      )
        ? cleaned
        : current;
    });
  }, [library]);
  useEffect(() => {
    if (!writeStorage(storageKeys.folders, JSON.stringify(folders)))
      notify('No se pudieron guardar las carpetas en este navegador.');
  }, [folders, notify]);
  return [folders, setFolders];
}
