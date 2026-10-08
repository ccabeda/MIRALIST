import React from 'react';
import { relatedTitles, similarTitles } from '../../domain/recommendations.js';
import { canonicalTitle } from '../../domain/organization.js';
import RelatedTitles from './RelatedTitles.jsx';
import TitleFacts from './TitleFacts.jsx';
import SagaOrder from './SagaOrder.jsx';

export default function TitleDetails({
  title,
  titles,
  library,
  onOpen,
  onAdd,
  onFolder,
  onFavorite,
  page,
  onPageChange,
  children,
  resource,
}) {
  const meta = title.metadata || {};
  const entry = library[title.id];
  const related = resource?.related?.length
    ? resource.related.map((item) => ({
        ...item,
        ...(canonicalTitle(item, titles) || {}),
        cover: (canonicalTitle(item, titles) || {}).cover || item.cover,
      }))
    : relatedTitles(title, titles);
  const similar = resource?.recommendations?.length
    ? resource.recommendations
        .map((item) => canonicalTitle(item, titles) || item)
        .filter((item) => item.id !== title.id && library[item.id]?.status !== 'Completado')
        .slice(0, 6)
    : similarTitles(title, titles, library);

  return (
    <>
      <span className="eyebrow">
        {title.category} / {title.format} / {title.year}
      </span>
      <h2 id="detail-title">{title.title}</h2>
      <p className="detail-subtitle">{title.subtitle}</p>
      <div className="detail-toolbar">
        <div className="detail-navigation" aria-label="Secciones de la ficha">
          <button aria-pressed={page === 'info'} onClick={() => onPageChange('info')}>
            Información
          </button>
        </div>
        <div className="detail-library-actions" aria-label="Acciones de biblioteca">
          <button
            className="btn btn-accent"
            onClick={() => {
              if (!entry) {
                onAdd();
              } else onPageChange(page === 'edit' ? 'info' : 'edit');
            }}
          >
            {entry ? (page === 'edit' ? 'Listo' : 'Editar') : '+ Agregar a mi biblioteca'}
          </button>
          <button className="btn btn-outline-light" onClick={onFolder}>
            Guardar en carpeta
          </button>
          <button
            className={`btn ${entry?.favorite ? 'btn-accent' : 'btn-outline-light'}`}
            aria-pressed={!!entry?.favorite}
            onClick={onFavorite}
          >
            {entry?.favorite ? '★ En favoritos' : '☆ Marcar favorito'}
          </button>
        </div>
      </div>
      {page === 'info' ? (
        <>
          {resource?.loading && <p role="status">Cargando datos de la obra…</p>}
          {resource?.error && (
            <div className="catalog-message" role="alert">
              <p>{resource.error} Se conserva la información disponible.</p>
              <button className="btn btn-outline-light" onClick={resource.retry}>
                Reintentar ficha
              </button>
            </div>
          )}
          <p>{title.description}</p>
          {title.aliases?.length > 0 && (
            <p className="detail-aliases">Otros nombres: {title.aliases.join(' / ')}</p>
          )}
          <span className="info-genre">{title.genre}</span>
          <TitleFacts title={title} />
          <p className="metadata-note">
            Datos del catálogo; tu puntuación personal se guarda por separado.
            {meta.url && (
              <>
                {' '}
                Fuente:{' '}
                <a href={meta.url} target="_blank" rel="noreferrer">
                  {meta.provider}
                </a>
                .
              </>
            )}
          </p>
          {!resource?.loading && !resource?.error && (
            <>
              <RelatedTitles
                items={related}
                heading="Obras relacionadas"
                explanation="Otras entregas de la misma saga; no implica que sean la continuación inmediata."
                relations={resource?.relations}
                showRelations
                library={library}
                onOpen={onOpen}
              />
              <RelatedTitles
                items={similar}
                heading="También te puede gustar"
                explanation={
                  resource?.recommendations?.length
                    ? 'Recomendaciones del catálogo para esta obra.'
                    : `Por su género: ${title.genre.toLowerCase()}.`
                }
                library={library}
                onOpen={onOpen}
              />
            </>
          )}
          <SagaOrder title={title} onOpen={onOpen} />
        </>
      ) : (
        <section aria-label="Editar obra">{children}</section>
      )}
    </>
  );
}
