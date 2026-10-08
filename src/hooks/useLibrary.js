import { applyEntryPatch } from '../domain/entry-updates.js';
import { normalizeEntry } from '../domain/entry-validation.js';
import { buildCatalog, normalizeTitle } from '../domain/catalog.js';
import { useEffect, useState } from 'react';
import { loadSavedLibrary } from '../services/library-migration.js';
import useFolders from './useFolders.js';
import useLibraryUndo from './useLibraryUndo.js';
import { bulkStatus, bulkFolders } from '../domain/bulk-actions.js';
import { mergeBackup } from '../domain/backup.js';
import { suggestTitleDate } from '../domain/watch-dates.js';
import { bulkUndo, canonicalTitle } from '../domain/organization.js';
import { storageKeys, writeStorage } from '../services/storage.js';

const blank = {
  status: 'Pendiente',
  progress: 0,
  score: 0,
  favorite: false,
  notes: '',
  startDate: '',
  finishDate: '',
};

export default function useLibrary({ titles: availableTitles, notify, onDuplicate }) {
  const [library, setLibrary] = useState(() => {
    try {
      return loadSavedLibrary(availableTitles);
    } catch {
      return {};
    }
  });
  const titles = buildCatalog(availableTitles, library);
  const [folders, setFolders] = useFolders(library, notify);
  const [suggestion, setSuggestion] = useState(null);
  const { undo, pushUndo, clearUndo, restoreLast } = useLibraryUndo({
    library,
    folders,
    setLibrary,
    setFolders,
    notify,
    onRestore: () => setSuggestion(null),
  });
  function savedTitle(candidate) {
    return canonicalTitle(
      candidate,
      titles.filter((item) => Object.hasOwn(library, item.id)),
    );
  }
  function ensureSaved(candidate) {
    const existing = savedTitle(candidate);
    if (existing) return { title: existing, alreadySaved: true };
    const title = canonicalTitle(candidate, titles) || candidate;
    return save(title.id, {}) ? { title, alreadySaved: false } : null;
  }

  useEffect(() => {
    if (!writeStorage(storageKeys.library, JSON.stringify(library)))
      notify('No se pudieron guardar los cambios en este navegador.');
  }, [library, notify]);
  function save(id, patch) {
    const requested = titles.find((item) => item.id === id);
    if (!requested) return;
    const existing = savedTitle(requested);
    if (existing && existing.id !== id) {
      onDuplicate(existing);
      notify(`Ya tenés ${existing.title} en tu biblioteca`);
      return;
    }
    const previous = library[id] || blank;
    const title = requested;
    let next;
    try {
      next = normalizeEntry(applyEntryPatch(title, previous, patch), title);
      next.catalog = normalizeTitle(title);
      if (!library[id]) next.addedAt = new Date().toISOString();
    } catch (error) {
      notify(error.message);
      return;
    }
    const suggested = suggestTitleDate(title, previous, next);
    if (suggested) setSuggestion({ id, ...suggested });
    else if (
      suggestion?.id === id &&
      (next[suggestion.field] || (patch.status && patch.status !== previous.status))
    )
      setSuggestion(null);
    setLibrary((prev) => ({ ...prev, [id]: next }));
    return next;
  }
  function acceptDate() {
    if (!suggestion || !library[suggestion.id]) return;
    save(suggestion.id, { [suggestion.field]: suggestion.date });
    setSuggestion(null);
  }
  function removeTitle(title) {
    pushUndo({
      kind: 'title',
      title,
      entry: library[title.id],
      folderIds: folders
        .filter((folder) => folder.titleIds.includes(title.id))
        .map((folder) => folder.id),
    });
    setLibrary((prev) => {
      const next = { ...prev };
      delete next[title.id];
      return next;
    });
    if (suggestion?.id === title.id) setSuggestion(null);
  }
  function removeFolder(folder) {
    pushUndo({ kind: 'folder', folder });
    setFolders((current) => current.filter((item) => item.id !== folder.id));
  }
  function toggleFavorite(title) {
    const favorite = !library[title.id]?.favorite;
    save(title.id, { favorite });
  }
  function changeManyStatuses(ids, status) {
    const next = bulkStatus(library, titles, ids, status);
    const changed = ids.filter((id) => next[id] !== library[id]).length;
    if (!changed) {
      notify('No se cambió el estado: las obras seleccionadas todavía no permiten ese estado.');
      return;
    }
    const action = bulkUndo(
      library,
      next,
      folders,
      folders,
      `Estado de ${ids.length} obras actualizado`,
    );
    pushUndo(action);
    setLibrary(next);
    setSuggestion(null);
    notify(
      `Estado actualizado en ${changed} obras${changed < ids.length ? '. Se omitieron las que aún no permiten ese estado.' : ''}`,
    );
  }
  function changeManyFolders(ids, destination, move) {
    const savedIds = ids.filter((id) => Object.hasOwn(library, id));
    const next = bulkFolders(folders, savedIds, destination, move);
    const action = bulkUndo(
      library,
      library,
      folders,
      next,
      `${savedIds.length} obras ${move ? 'movidas' : 'agregadas'} a la carpeta`,
    );
    pushUndo(action);
    setFolders(next);
    notify(`${savedIds.length} obras ${move ? 'movidas' : 'agregadas'} a la carpeta`);
  }
  function importCollection(backup, useImported) {
    const next = mergeBackup(library, folders, backup, useImported);
    setLibrary(next.library);
    setFolders(next.folders);
    setSuggestion(null);
    clearUndo();
    notify('Copia importada. Tus obras actuales se conservaron.');
  }

  return {
    titles,
    library,
    folders,
    setFolders,
    suggestion,
    setSuggestion,
    undo,
    clearUndo,
    ensureSaved,
    save,
    acceptDate,
    removeTitle,
    removeFolder,
    restoreLast,
    toggleFavorite,
    changeManyStatuses,
    changeManyFolders,
    importCollection,
  };
}
