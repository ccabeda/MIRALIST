import { isRecord } from '../domain/entry-fields.js';
import { readBackup } from '../domain/backup.js';
import { readStorage, writeStorage } from './storage.js';

const revision = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const draftKey = (userId) => `miralist.account.${userId}.pending.v1`;

export function parseDraft(raw) {
  if (raw === null || raw === 'null') return { kind: 'empty' };
  try {
    if (typeof raw !== 'string' || raw.length > 5 * 1024 * 1024) throw new Error();
    const data = JSON.parse(raw);
    if (!isRecord(data) || typeof data.version !== 'string' || !revision.test(data.version))
      throw new Error();
    const { library, folders } = readBackup(
      JSON.stringify({
        app: 'MiraList',
        version: 1,
        library: data.library,
        folders: data.folders,
      }),
      [],
    );
    return { kind: 'valid', version: data.version, collection: { library, folders } };
  } catch {
    return { kind: 'invalid', raw };
  }
}

export const readDraft = (userId) => parseDraft(readStorage(draftKey(userId)));
export const saveDraft = (userId, collection, version) =>
  writeStorage(draftKey(userId), JSON.stringify(collection ? { ...collection, version } : null));

export function downloadInvalidDraft(raw) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'miralist-borrador-para-recuperar.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
