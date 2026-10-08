import React from 'react';
import MediaCard from './MediaCard.jsx';
import { statuses } from '../../domain/library.js';
import { animeFormats } from '../../services/catalog/providers.js';

export default function Catalog({
  section,
  visible,
  library,
  query,
  setQuery,
  format,
  setFormat,
  status,
  setStatus,
  openTitle,
  add,
  category,
  remote,
}) {
  return (
    <section className="catalog">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ENCONTRÁ TU PRÓXIMA HISTORIA</span>
          <h2>{section === 'Inicio' ? 'Algo para cada momento' : section}</h2>
        </div>
        {!remote.idle && (
          <span className="result-count">
            {remote.loading
              ? 'Buscando…'
              : remote.error || remote.configured === false
                ? 'Consulta no disponible'
                : `${visible.length} títulos en esta página`}
          </span>
        )}
      </div>
      <div className="filter-bar">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribí al menos 3 letras, por ejemplo: dra"
            maxLength={200}
            aria-label="Buscar títulos"
          />
        </label>
        {category === 'Anime' && (
          <select
            className="form-select"
            aria-label="Filtrar por formato"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="Todos">Formato (esta página)</option>
            {Object.keys(animeFormats)
              .filter((f) => f !== 'Todos')
              .map((f) => (
                <option key={f}>{f}</option>
              ))}
          </select>
        )}
        <select
          className="form-select"
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Todos">Todos los estados (esta página)</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {remote.idle && (
        <div className="empty-state">
          <span aria-hidden="true">⌕</span>
          <h3>¿Qué querés encontrar?</h3>
          <p>
            Escribí al menos 3 letras del título. Por ejemplo, «dra» para buscar títulos que
            contengan ese texto.
          </p>
        </div>
      )}
      {remote.loading && (
        <p className="catalog-message" role="status">
          Buscando {category === 'Anime' ? 'anime' : category.toLowerCase()}…
        </p>
      )}
      {remote.error && (
        <div className="catalog-message" role="alert">
          <p>{remote.error}</p>
          <button className="btn btn-accent" onClick={remote.retry}>
            Reintentar
          </button>
        </div>
      )}
      {remote.configured === false && (
        <div className="empty-state">
          <h3>Este catálogo todavía no está conectado</h3>
          <p>
            {category === 'Anime'
              ? 'Los animes estarán disponibles cuando se active MyAnimeList.'
              : 'Series y películas estarán disponibles cuando se active TMDB.'}{' '}
            Tu biblioteca guardada sigue disponible.
          </p>
          <button className="btn btn-outline-light" onClick={remote.retry}>
            Comprobar conexión
          </button>
        </div>
      )}
      <div className="poster-grid" aria-busy={remote.loading}>
        {visible.map((title) => (
          <MediaCard
            key={title.id}
            title={title}
            entry={library[title.id]}
            onOpen={openTitle}
            onAdd={add}
          />
        ))}
      </div>
      {!remote.idle &&
        !remote.loading &&
        !remote.error &&
        remote.configured !== false &&
        !visible.length && (
          <div className="empty-state">
            <span>⌕</span>
            <h3>No hay títulos por acá</h3>
            <p>
              Probá otra búsqueda, otra página o cambiá los filtros. Los filtros se aplican a esta
              página; para filtrar tus obras, usá Mi biblioteca.
            </p>
            <button
              className="btn btn-outline-light"
              onClick={() => {
                setQuery('');
                setFormat('Todos');
                setStatus('Todos');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
    </section>
  );
}
