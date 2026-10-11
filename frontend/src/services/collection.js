import { makeBackup, readBackup } from '../domain/backup.js';

export async function collectionRequest(userId, collection) {
  const headers = { 'X-Miralist-User': userId };
  if (collection) {
    const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    if (!csrf.ok) throw new Error('No se pudo preparar el guardado. Reintentá.');
    headers['X-CSRF-TOKEN'] = (await csrf.json()).token;
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch('/api/library', {
    method: collection ? 'PUT' : 'GET',
    credentials: 'same-origin',
    headers,
    ...(collection ? { body: JSON.stringify(collection) } : {}),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(
      response.status === 401
        ? 'Tu sesión venció. Volvé a iniciar sesión para guardar.'
        : body?.title || 'No se pudo conectar con tu biblioteca. Comprobá el backend y reintentá.',
    );
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }
  const data = await response.json();
  if (data.library) {
    for (const entry of Object.values(data.library)) {
      for (const key of ['addedAt', 'watchedDate', 'seasonProgress']) {
        if (entry[key] === null) delete entry[key];
      }
    }
    const checked = readBackup(JSON.stringify(makeBackup(data.library, data.folders)), []);
    return { version: data.version, library: checked.library, folders: checked.folders };
  }
  return data;
}

export function downloadCollection(collection) {
  const blob = new Blob(
    [JSON.stringify(makeBackup(collection.library, collection.folders), null, 2)],
    {
      type: 'application/json',
    },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'miralist-cambios-pendientes.json';
  anchor.click();
  URL.revokeObjectURL(url);
}
