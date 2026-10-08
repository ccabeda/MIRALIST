import { useState } from 'react';
import { moveTitle } from '../domain/organization.js';

export default function useFolderOrdering({ canOrder, activeFolder, setFolders, notify }) {
  const [draggedId, setDraggedId] = useState(null);
  const [dropId, setDropId] = useState(null);
  function reset() {
    setDraggedId(null);
    setDropId(null);
  }
  function reorder(movingId, targetId) {
    if (!canOrder || !targetId || movingId === targetId) return;
    setFolders((current) =>
      current.map((folder) =>
        folder.id === activeFolder.id
          ? { ...folder, titleIds: moveTitle(folder.titleIds, movingId, targetId) }
          : folder,
      ),
    );
    notify('Orden de carpeta guardado');
  }
  return { draggedId, dropId, setDraggedId, setDropId, reset, reorder };
}
