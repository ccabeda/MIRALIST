import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { collectionRequest, downloadCollection } from '../services/collection.js';
import { readDraft, saveDraft, downloadInvalidDraft } from '../services/collection-draft.js';
import { createCollectionSync } from '../services/collection-sync.js';

const apply = (update, previous) => (typeof update === 'function' ? update(previous) : update);

export default function useCollectionStore(userId, notify) {
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const store = useMemo(
    () =>
      createCollectionSync(userId, {
        request: collectionRequest,
        readDraft,
        saveDraft,
        download: downloadCollection,
        downloadInvalid: downloadInvalidDraft,
        notify: (message) => notifyRef.current(message),
      }),
    [userId],
  );
  const { collection, ...sync } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);
  useEffect(() => {
    if (!userId || !sync.dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [userId, sync.dirty]);
  return {
    ...collection,
    ...sync,
    setLibrary: (update) =>
      store.update((previous) => {
        const library = apply(update, previous.library);
        if (library === previous.library) return previous;
        const folders = previous.folders.map((folder) => ({
          ...folder,
          titleIds: folder.titleIds.filter((id) => Object.hasOwn(library, id)),
        }));
        return { library, folders };
      }),
    setFolders: (update) =>
      store.update((previous) => ({ ...previous, folders: apply(update, previous.folders) })),
    retry: store.retry,
    reloadServer: store.reloadServer,
    download: store.download,
  };
}
