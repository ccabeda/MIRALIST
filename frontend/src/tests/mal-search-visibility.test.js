import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogApi } from '../../server/catalog-api.js';

test('la búsqueda incluye títulos gray como Onmyou Kaiten y excluye solo black', async () => {
  const body = {
    data: [
      { node: { id: 61150, title: 'Onmyou Kaiten Re:Birth', nsfw: 'gray' } },
      { node: { id: 2, title: 'Otra obra', nsfw: 'white' } },
      { node: { id: 3, title: 'Explícito', nsfw: 'black' } },
    ],
    paging: { next: 'https://api.myanimelist.net/v2/anime?offset=24' },
  };
  let calls = 0;
  const handler = createCatalogApi({
    malClientId: 'test',
    fetcher: async (target) => {
      calls++;
      const url = new URL(target);
      assert.equal(url.searchParams.get('nsfw'), 'true');
      assert.ok(url.searchParams.get('fields').split(',').includes('nsfw'));
      return Response.json(body);
    },
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    let received;
    await handler(
      { method: 'GET', url: '/api/catalog/mal?query=Onmyou' },
      {
        writeHead(status) {
          assert.equal(status, 200);
        },
        end(json) {
          received = JSON.parse(json);
        },
      },
    );
    assert.deepEqual(
      received.data.map(({ node }) => node.id),
      [61150, 2],
    );
    assert.deepEqual(received.paging, body.paging);
  }
  assert.equal(calls, 1);
});
