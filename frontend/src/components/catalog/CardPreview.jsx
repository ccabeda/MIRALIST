import React from 'react';
import useTitleResource from '../../hooks/useTitleResource.js';
import { previewFacts } from '../../domain/card-preview.js';

const ignoreTitles = () => {};

export default function CardPreview({ title, side, id }) {
  const resource = useTitleResource(
    title.metadata?.detailLevel === 'full' ? null : title,
    ignoreTitles,
  );
  const full = resource.title || title;
  return (
    <aside className={`card-preview ${side}`} id={id} aria-label={`Resumen de ${title.title}`}>
      <div className="card-preview-content">
        <span className="card-preview-category">{full.category}</span>
        <strong className="card-preview-title">{full.title}</strong>
        <dl>
          {previewFacts(full).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {resource.loading && <small role="status">Completando datos…</small>}
        {resource.error && (
          <div className="card-preview-error" role="alert">
            <small>No se pudieron completar los datos.</small>
            <button type="button" onClick={resource.retry}>
              Reintentar
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
