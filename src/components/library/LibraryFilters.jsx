import React from 'react';
import { statuses } from '../../domain/library.js';
export default function LibraryFilters({
  section,
  folderOverview,
  query,
  setQuery,
  category,
  setCategory,
  status,
  setStatus,
  favoritesOnly,
  setFavoritesOnly,
  order,
  setOrder,
  activeFolder,
}) {
  return (
    <>
      {' '}
      <div className="filter-bar library-filters">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label={folderOverview ? 'Buscar carpetas' : 'Buscar en mi biblioteca'}
            placeholder={folderOverview ? 'Buscar una carpeta…' : 'Buscar entre tus guardados…'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {!folderOverview && (
          <>
            {section === 'screen' && (
              <select
                className="form-select"
                aria-label="Tipo de contenido"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="Todos">Todo el contenido</option>
                {['Series', 'Películas'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            )}
            <select
              className="form-select"
              aria-label="Estado en mi biblioteca"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="Todos">Todos los estados</option>
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </>
        )}
      </div>
      {!folderOverview && (
        <div className="collection-controls">
          <label className="favorites-filter">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
            />{' '}
            ★ Solo favoritos
          </label>
          <label className="sort-control">
            Ordenar por
            <select
              className="form-select"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
            >
              <option value="recent">Agregados recientemente</option>
              {activeFolder && <option value="manual">Orden de carpeta</option>}
              <option value="score">Mayor puntuación</option>
              <option value="title">Título: A–Z</option>
              <option value="finished">Fecha de finalización</option>
            </select>
          </label>
        </div>
      )}
    </>
  );
}
