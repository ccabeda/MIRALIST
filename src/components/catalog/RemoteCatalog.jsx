import React, { useState } from 'react';
import Catalog from './Catalog.jsx';
import useRemoteCatalog from '../../hooks/useRemoteCatalog.js';
import { canonicalTitle } from '../../domain/organization.js';

export default function RemoteCatalog({ section, titles, library, onTitles, openTitle, add }) {
  const [homeCategory, setHomeCategory] = useState('Anime');
  const category = section === 'Inicio' ? homeCategory : section;
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [page, setPage] = useState(1);
  const remote = useRemoteCatalog({ category, query, format, page, onTitles });
  const items = [
    ...new Map(
      remote.items.map((item) => {
        const saved = canonicalTitle(item, titles);
        return [saved?.id || item.id, saved || item];
      }),
    ).values(),
  ];
  const visible = items.filter((item) => status === 'Todos' || library[item.id]?.status === status);
  const change = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  return (
    <>
      {section === 'Inicio' && (
        <nav className="catalog-categories" aria-label="Catálogo a explorar">
          {['Anime', 'Series', 'Películas'].map((item) => (
            <button
              key={item}
              className="btn btn-outline-light"
              aria-pressed={category === item}
              onClick={() => {
                setHomeCategory(item);
                setQuery('');
                setFormat('Todos');
                setStatus('Todos');
                setPage(1);
              }}
            >
              {item}
            </button>
          ))}
        </nav>
      )}
      <Catalog
        section={section === 'Inicio' ? 'Inicio' : category}
        category={category}
        visible={visible}
        library={library}
        query={query}
        setQuery={change(setQuery)}
        format={format}
        setFormat={change(setFormat)}
        status={status}
        setStatus={setStatus}
        openTitle={openTitle}
        add={add}
        remote={remote}
      />
      {!remote.idle && !remote.loading && !remote.error && remote.configured !== false && (
        <nav className="catalog-pagination" aria-label="Páginas del catálogo">
          <button
            className="btn btn-outline-light"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </button>
          <span aria-live="polite">Página {page}</span>
          <button
            className="btn btn-accent"
            disabled={!remote.hasNext}
            onClick={() => setPage((value) => value + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </>
  );
}
