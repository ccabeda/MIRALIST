const empty = () => ({ library: {}, folders: [] });

// Owns the save queue and revisions independently from React's rendering cycle.
export function createCollectionSync(
  userId,
  {
    request,
    readDraft,
    saveDraft,
    download,
    downloadInvalid,
    notify,
    schedule = (action) => setTimeout(action, 500),
    cancel = clearTimeout,
  },
) {
  let snapshot = {
    collection: empty(),
    ready: !userId,
    status: userId ? 'loading' : 'idle',
    error: '',
    conflict: false,
    sessionExpired: false,
    dirty: false,
    invalidDraft: false,
  };
  let active = false,
    saving = false,
    blocked = false,
    loadId = 0,
    timer;
  let version = null,
    acknowledged = snapshot.collection,
    invalidRaw;
  const listeners = new Set();
  function publish(patch) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }
  function persist(collection, revision = version) {
    if (!saveDraft(userId, collection, revision))
      notify(
        'No se pudo conservar una copia local de los cambios pendientes. Mantené abierta la página hasta guardar.',
      );
  }
  function failure(error) {
    blocked = true;
    publish({
      status: 'error',
      error: error.message || 'No se guardaron los cambios. Reintentá.',
      conflict: error.status === 409 && error.code !== 'account_changed',
      sessionExpired: error.status === 401 || error.code === 'account_changed',
    });
  }
  async function load() {
    if (!userId) return;
    const id = ++loadId;
    publish({ status: 'loading', error: '', ready: false });
    try {
      const remote = await request(userId);
      if (!active || id !== loadId) return;
      const server = { library: remote.library, folders: remote.folders };
      const draft = readDraft(userId);
      version = remote.version;
      acknowledged = server;
      invalidRaw = draft.kind === 'invalid' ? draft.raw : undefined;
      const invalid = draft.kind === 'invalid';
      const pending = draft.kind === 'valid';
      const mismatch = pending && draft.version !== version;
      if (pending) version = draft.version;
      blocked = invalid || mismatch;
      publish({
        collection: pending ? draft.collection : server,
        ready: true,
        status: blocked ? 'error' : pending ? 'pending' : 'saved',
        dirty: pending || invalid,
        conflict: blocked,
        invalidDraft: invalid,
        sessionExpired: false,
        error: invalid
          ? 'El borrador pendiente no es válido. Conservamos el archivo original y mostramos la biblioteca del servidor. Exportalo antes de continuar.'
          : mismatch
            ? 'Hay cambios pendientes y la biblioteca del servidor cambió. Exportá tu copia antes de cargar la del servidor.'
            : '',
      });
      if (pending && !blocked) queue();
    } catch (error) {
      if (active && id === loadId) failure(error);
    }
  }
  function queue() {
    cancel(timer);
    if (blocked || !active) return;
    publish({ status: 'pending' });
    timer = schedule(flush);
  }
  async function flush() {
    if (saving || blocked || !active) return;
    saving = true;
    publish({ status: 'saving' });
    try {
      while (active && snapshot.collection !== acknowledged) {
        const sent = snapshot.collection;
        const result = await request(userId, { ...sent, version });
        version = result.version;
        acknowledged = sent;
        persist(snapshot.collection !== sent ? snapshot.collection : null);
      }
      if (active)
        publish({
          status: 'saved',
          dirty: false,
          error: '',
          conflict: false,
          sessionExpired: false,
        });
    } catch (error) {
      if (active) failure(error);
    } finally {
      saving = false;
    }
  }
  function exportPending() {
    if (snapshot.invalidDraft) downloadInvalid(invalidRaw);
    else download(snapshot.collection);
  }
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    start() {
      active = true;
      return load();
    },
    stop() {
      active = false;
      loadId++;
      cancel(timer);
    },
    update(transform) {
      if (!userId || !snapshot.ready || snapshot.invalidDraft) return;
      const collection = transform(snapshot.collection);
      if (collection === snapshot.collection) return;
      publish({ collection, dirty: true });
      persist(collection);
      queue();
    },
    retry() {
      if (snapshot.invalidDraft || snapshot.conflict) return;
      if (!snapshot.ready) return load();
      blocked = false;
      publish({ sessionExpired: false, error: '' });
      queue();
    },
    reloadServer() {
      exportPending();
      if (!saveDraft(userId, null)) {
        notify(
          'No se pudo descartar el borrador. Conservamos tus cambios; revisá el almacenamiento del navegador.',
        );
        return;
      }
      return load();
    },
    download: exportPending,
  };
}
