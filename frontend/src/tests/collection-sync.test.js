import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollectionSync } from '../services/collection-sync.js';
import { parseDraft } from '../services/collection-draft.js';

const version = '11111111-1111-1111-1111-111111111111';
const newer = '22222222-2222-2222-2222-222222222222';
const collection = { library: {}, folders: [] };
function fixture(overrides = {}) {
  const writes = [],
    downloads = [],
    calls = [];
  let scheduled;
  const dependencies = {
    request: async (_, body) => {
      calls.push(body);
      return { ...collection, version };
    },
    readDraft: () => ({ kind: 'empty' }),
    saveDraft: (...args) => {
      writes.push(args);
      return true;
    },
    download: (value) => downloads.push(value),
    downloadInvalid: (value) => downloads.push(value),
    notify: () => {},
    schedule: (action) => {
      scheduled = action;
    },
    cancel: () => {
      scheduled = undefined;
    },
    ...overrides,
  };
  return {
    store: createCollectionSync('user', dependencies),
    writes,
    downloads,
    calls,
    flush: () => scheduled?.(),
  };
}

test('draft validation preserves invalid originals and accepts valid revisions', () => {
  for (const raw of [
    '{',
    '{}',
    JSON.stringify({ ...collection, version: 'bad' }),
    JSON.stringify({
      library: {},
      folders: [{ id: 'f', name: 'X', titleIds: ['missing'] }],
      version,
    }),
  ]) {
    assert.deepEqual(parseDraft(raw), { kind: 'invalid', raw });
  }
  assert.equal(parseDraft(null).kind, 'empty');
  assert.deepEqual(parseDraft(JSON.stringify({ ...collection, version })), {
    kind: 'valid',
    version,
    collection,
  });
});

test('conflicting edits retain the original revision until explicit server reload', async () => {
  const f = fixture({ readDraft: () => ({ kind: 'valid', version: newer, collection }) });
  await f.store.start();
  assert.equal(f.store.getSnapshot().conflict, true);
  f.store.update(() => ({ ...collection, folders: [{ id: 'f' }] }));
  assert.equal(f.writes.at(-1)[2], newer);
  await f.flush();
  assert.equal(f.calls.length, 1);
});

test('corrupt drafts cannot overwrite the server and are downloaded before discarding', async () => {
  let draft = { kind: 'invalid', raw: '{broken' };
  const f = fixture({ readDraft: () => draft });
  await f.store.start();
  f.store.update(() => ({ library: { lost: true }, folders: [] }));
  assert.deepEqual(f.store.getSnapshot().collection, collection);
  assert.equal(f.writes.length, 0);
  draft = { kind: 'empty' };
  await f.store.reloadServer();
  assert.deepEqual(f.downloads, ['{broken']);
  assert.equal(f.store.getSnapshot().invalidDraft, false);
});

test('edits during a save are serialized using the returned revision', async () => {
  let resolve;
  const bodies = [];
  const f = fixture({
    request: async (_, body) => {
      if (!body) return { ...collection, version };
      bodies.push(body);
      if (bodies.length === 1)
        return new Promise((done) => {
          resolve = done;
        });
      return { version };
    },
  });
  await f.store.start();
  f.store.update(() => ({ ...collection, library: { first: true } }));
  const saving = f.flush();
  f.store.update(() => ({ ...collection, library: { second: true } }));
  resolve({ version: newer });
  await saving;
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1].version, newer);
  assert.deepEqual(bodies[1].library, { second: true });
  assert.equal(f.store.getSnapshot().dirty, false);
  assert.equal(f.writes.at(-1)[1], null);
});

test('failed saves keep the draft and retry without losing edits', async () => {
  let fail = true;
  const f = fixture({
    request: async (_, body) => {
      if (body && fail) throw Object.assign(new Error('Expired'), { status: 401 });
      return { ...collection, version };
    },
  });
  await f.store.start();
  f.store.update(() => ({ ...collection, library: { saved: true } }));
  await f.flush();
  assert.equal(f.store.getSnapshot().sessionExpired, true);
  assert.equal(f.store.getSnapshot().dirty, true);
  fail = false;
  f.store.retry();
  await f.flush();
  assert.equal(f.store.getSnapshot().status, 'saved');
});
