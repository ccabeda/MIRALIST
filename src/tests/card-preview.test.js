import test from 'node:test';
import assert from 'node:assert/strict';
import { previewFacts } from '../domain/card-preview.js';
import { fromTmdb } from '../services/catalog/adapters.js';

test('vista previa: anime incluye episodios, formato y estreno, sin géneros', () => {
  const facts = Object.fromEntries(
    previewFacts({
      category: 'Anime',
      format: 'OVA',
      total: 8,
      genre: 'Acción',
      metadata: { startDate: '2016-03-11' },
    }),
  );
  assert.equal(facts.Formato, 'OVA');
  assert.equal(facts.Episodios, '8');
  assert.match(facts.Estreno, /2016/);
  assert.equal(Object.keys(facts).length, 3);
});
test('vista previa: películas muestran duración y series temporadas sin contar especiales', () => {
  const movie = fromTmdb(
    { id: 1, title: 'Movie', runtime: 120, release_date: '2020-01-01' },
    'movie',
  );
  const film = Object.fromEntries(previewFacts(movie));
  assert.equal(film.Duración, '120 min');
  assert.equal(film.Episodios, undefined);
  const series = fromTmdb(
    { id: 2, name: 'Serie', number_of_seasons: 3, number_of_episodes: 24 },
    'tv',
  );
  const tv = Object.fromEntries(previewFacts(series));
  assert.equal(tv.Temporadas, '3');
  assert.equal(tv.Episodios, '24');
  assert.equal(
    Object.fromEntries(
      previewFacts({ category: 'Series', seasons: [{ number: 0 }, { number: 1 }], metadata: {} }),
    ).Temporadas,
    '1',
  );
});
test('vista previa: no inventa estreno ni cantidad de episodios desconocidos', () => {
  const facts = Object.fromEntries(
    previewFacts({ category: 'Anime', format: 'TV', total: null, metadata: {} }),
  );
  assert.equal(facts.Estreno, 'No disponible');
  assert.equal(facts.Episodios, 'No disponible');
});
