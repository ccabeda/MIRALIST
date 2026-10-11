import React from 'react';
import { isMovie, hasKnownTotal } from '../../domain/library.js';
import RelatedCover from '../catalog/RelatedCover.jsx';

export default function ContinueWatching({ library, watching, navigate, openTitle }) {
  return (
    <>
      <section className="stats-row" aria-label="Estadísticas de tu biblioteca">
        {[
          [Object.keys(library).length, 'En tu biblioteca'],
          [Object.values(library).filter((e) => e.status === 'Viendo').length, 'Viendo ahora'],
          [Object.values(library).filter((e) => e.status === 'Completado').length, 'Completados'],
          [Object.values(library).filter((e) => e.favorite).length, 'Favoritos'],
        ].map(([n, label]) => (
          <div key={label}>
            <strong>{String(n).padStart(2, '0')}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <section className="continue-section">
        <div className="section-heading">
          <h2>
            Seguí donde quedaste
            <span className="green-dot" />
          </h2>
          <button className="text-button" onClick={() => navigate('Mi biblioteca')}>
            Ver mi biblioteca ↗
          </button>
        </div>
        <div className="row g-3">
          {watching.length ? (
            watching.map((t) => (
              <div className="col-md-6" key={t.id}>
                <article className="continue-card">
                  <button
                    className="mini-poster"
                    onClick={() => openTitle(t)}
                    aria-label={`Ver ${t.title}`}
                  >
                    <RelatedCover title={t} />
                  </button>
                  <div className="continue-body">
                    <small>
                      {t.category} · {t.format}
                    </small>
                    <button className="title-button" onClick={() => openTitle(t)}>
                      {t.title}
                    </button>
                    <div className="episode-label">
                      {isMovie(t) ? (
                        'Película en curso'
                      ) : (
                        <>
                          Capítulos vistos: {library[t.id].progress}{' '}
                          <span>
                            {hasKnownTotal(t.total) ? `de ${t.total}` : '(total desconocido)'}
                          </span>
                        </>
                      )}
                    </div>
                    {hasKnownTotal(t.total) && (
                      <div
                        className="progress"
                        role="progressbar"
                        aria-label={`Progreso de ${t.title}`}
                        aria-valuenow={library[t.id].progress}
                        aria-valuemin={0}
                        aria-valuemax={t.total}
                      >
                        <div
                          className="progress-bar"
                          style={{ width: `${(library[t.id].progress / t.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </article>
              </div>
            ))
          ) : (
            <p className="muted">
              Agregá una obra y marcala como «Viendo» para continuar desde acá.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
