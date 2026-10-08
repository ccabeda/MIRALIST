import React from 'react';
import RelatedCover from './RelatedCover.jsx';
import { relationNames } from '../../domain/discovery.js';

export default function RelatedTitles({
  items,
  heading,
  explanation,
  relations = [],
  showRelations = false,
  library,
  onOpen,
}) {
  function caption(item) {
    const type = showRelations
      ? relations.find((edge) => edge.to === `mal-${item.providerIds?.mal}`)?.type
      : null;
    return [
      type && (relationNames[type] || 'Relacionada'),
      item.format !== 'Desconocido' && item.format,
      item.year,
      library[item.id]?.status,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return (
    <section className="detail-recommendations">
      <h3>{heading}</h3>
      <p>{explanation}</p>
      {items.length ? (
        <div className="related-grid">
          {items.map((item) => (
            <button key={item.id} onClick={() => onOpen(item)}>
              <RelatedCover title={item} />
              <span>
                <strong>{item.title}</strong>
                <small>{caption(item)}</small>
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">No hay otras obras disponibles para esta ficha.</p>
      )}
    </section>
  );
}
