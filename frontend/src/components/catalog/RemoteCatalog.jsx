import React, { useState } from 'react';
import Catalog from './Catalog.jsx';
import useRemoteCatalog from '../../hooks/useRemoteCatalog.js';
import { canonicalTitle } from '../../domain/organization.js';

export default function RemoteCatalog({
  section,
  query,
  setQuery,
  titles,
  library,
  onTitles,
  openTitle,
  add,
}) {
  const category = section;
  const [format, setFormat] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState('relevance');
  const remote = useRemoteCatalog({ category, query, format, page, order, onTitles });
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
      <Catalog
        section={category}
        category={category}
        visible={visible}
        library={library}
        query={query}
        setQuery={change(setQuery)}
        format={format}
        setFormat={change(setFormat)}
        status={status}
        setStatus={setStatus}
        order={order}
        setOrder={change(setOrder)}
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
