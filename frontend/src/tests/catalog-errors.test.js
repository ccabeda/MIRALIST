import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogApi } from '../../server/catalog-api.js';
import { cachedJson } from '../services/catalog/http.js';

test('la API distingue demora, conexión, respuesta inválida y error del proveedor', async () => {
  for (const provider of ['mal', 'tmdb']) {
    for (const [failure, status, suffix, code] of [
      [new DOMException('Private details', 'TimeoutError'), 504, 'TIMEOUT', 'timeout'],
      [new TypeError('Private details'), 502, 'CONNECTION_FAILED', 'network'],
      [new SyntaxError('Private details'), 502, 'INVALID_RESPONSE', 'invalid-response'],
      [null, 502, 'UNAVAILABLE', 'unavailable'],
    ]) {
      const api = createCatalogApi({
        malClientId: 'test',
        token: 'test',
        fetcher: async () => {
          if (failure) throw failure;
          return new Response('', { status: 500 });
        },
      });
      let result;
      const res = {
        writeHead(value) {
          assert.equal(value, status);
        },
        end(body) {
          result = JSON.parse(body);
        },
      };
      await api({ method: 'GET', url: `/api/catalog/${provider}?id=1&kind=movie` }, res);
      assert.deepEqual(result, { error: `${provider.toUpperCase()}_${suffix}` });
      const url = `https://${suffix.toLowerCase()}.test/api/catalog/${provider}?id=1`;
      await assert.rejects(
        cachedJson(url, {
          fetcher: async () => Response.json(result, { status }),
        }),
        (error) => {
          assert.equal(error.code, code);
          assert.match(error.message, new RegExp(provider === 'mal' ? 'MyAnimeList' : 'TMDB'));
          assert.equal(error.message.includes('Private details'), false);
          return true;
        },
      );
      assert.deepEqual(
        await cachedJson(url, {
          fetcher: async () => Response.json({ recovered: true }),
        }),
        { recovered: true },
      );
    }
  }
});

test('una espera agotada en el navegador también informa timeout', async () => {
  await assert.rejects(
    cachedJson('https://browser-timeout.test/', {
      fetcher: async () => {
        throw new DOMException('', 'AbortError');
      },
    }),
    { code: 'timeout' },
  );
});
