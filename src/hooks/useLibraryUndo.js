import { useState } from 'react';
import { addTitleToFolders, restoreFolder } from '../domain/folders.js';
import { restoreBulk } from '../domain/organization.js';

export default function useLibraryUndo({
  library,
  folders,
  setLibrary,
  setFolders,
  notify,
  onRestore,
}) {
  const [undoItems, setUndoItems] = useState([]);
  const undo = undoItems.at(-1);
  function pushUndo(action) {
    if (action) setUndoItems((items) => [...items, action]);
  }
  function clearUndo() {
    setUndoItems([]);
  }
  function restoreLast() {
    if (!undo) return;
    if (undo.kind === 'bulk') {
      const restored = restoreBulk(library, folders, undo);
      setLibrary(restored.library);
      setFolders(restored.folders);
      onRestore();
      notify(
        restored.skipped
          ? 'Se deshizo lo posible. Se conservaron los cambios posteriores.'
          : 'Cambio en grupo deshecho',
      );
    } else if (undo.kind === 'title') {
      setLibrary((current) => ({
        ...current,
        [undo.title.id]: current[undo.title.id] || undo.entry,
      }));
      setFolders((current) => addTitleToFolders(current, undo.title.id, undo.folderIds));
    } else setFolders((current) => restoreFolder(current, undo.folder, library));
    setUndoItems((items) => items.slice(0, -1));
    if (undo.kind !== 'bulk') notify('Se restauró lo eliminado');
  }

  return { undo, pushUndo, clearUndo, restoreLast };
}
