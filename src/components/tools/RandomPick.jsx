import React, { useState } from 'react';
import MediaCard from '../catalog/MediaCard.jsx';
import { choosePending, pendingTitles } from '../../domain/random-pick.js';

export default function RandomPick({ titles, library, onOpen }) {
  const [category, setCategory] = useState('Todos');
  const [genre, setGenre] = useState('Todos');
  const [result, setResult] = useState(null);
  const candidates = pendingTitles(titles, library, category, genre);
  const genres = [
    ...new Set(pendingTitles(titles, library, category).map((title) => title.genre)),
  ].sort();
  return (
    <>
      <p>Una sorpresa entre tus pendientes. Elegir una obra no cambia su estado.</p>
      <div className="tools-filters">
        <label>
          Tipo
          <select
            className="form-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setGenre('Todos');
              setResult(null);
            }}
          >
            <option>Todos</option>
            {['Anime', 'Series', 'Películas'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Género
          <select
            className="form-select"
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              setResult(null);
            }}
          >
            <option>Todos</option>
            {genres.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="tools-help">{candidates.length} pendientes coinciden con tus filtros.</p>
      <button
        className="btn btn-accent"
        disabled={!candidates.length}
        onClick={() => setResult(choosePending(candidates, result?.id))}
      >
        {result ? 'Elegir otra' : 'Sorprendeme'}
      </button>
      {!candidates.length && (
        <p role="status">
          No hay pendientes con estos filtros. Probá otro tipo o guardá una obra como Pendiente.
        </p>
      )}
      {result && (
        <div className="random-result" aria-live="polite">
          <MediaCard title={result} entry={library[result.id]} onOpen={onOpen} />
        </div>
      )}
    </>
  );
}
