import React from 'react';
import RelatedCover from '../catalog/RelatedCover.jsx';
import useUpcomingReleases from '../../hooks/useUpcomingReleases.js';

const formatDate = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export default function UpcomingReleases({ titles, library, openTitle, onTitles }) {
  const { following, releases, result, refresh } = useUpcomingReleases(titles, library, onTitles);
  return (
    <section className="recommendation-section" aria-label="Próximos capítulos">
      <h2>Próximos capítulos</h2>
      <p className="muted">
        De las series y animes que estás viendo. Las fechas pueden cambiar y no indican
        disponibilidad en tu plataforma.
      </p>
      {!following.length && <p>Marcá una serie o anime como «Viendo» para seguir sus estrenos.</p>}
      {following.length > 0 && !result && <p role="status">Consultando próximos capítulos…</p>}
      {!!result?.errors && (
        <p role="alert">Algunos estrenos no pudieron actualizarse. Podés volver a intentar.</p>
      )}
      {following.length > 0 && (
        <button className="btn btn-outline-light" disabled={!result} onClick={refresh}>
          {!result
            ? 'Consultando estrenos…'
            : result.errors
              ? 'Reintentar estrenos'
              : 'Actualizar estrenos'}
        </button>
      )}
      <div className="related-grid">
        {releases.map(({ title, info }) => (
          <button key={title.id} onClick={() => openTitle(title)}>
            <RelatedCover title={title} />
            <span>
              <strong>{title.title}</strong>
              {info?.date && <time dateTime={info.date}>{formatDate(info.date)}</time>}
              <small>
                {info?.text ||
                  (result ? 'No se pudo actualizar esta obra.' : 'Consultando próximos capítulos…')}
              </small>
              {info && <small>Fuente: {info.source || title.metadata?.provider}</small>}
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {following.some((title) => title.providerIds?.mal) && (
        <p className="muted">
          Fechas de anime:{' '}
          <a href="https://animeschedule.net" target="_blank" rel="noreferrer">
            AnimeSchedule
          </a>
          . Se muestran en tu fecha local.
        </p>
      )}
    </section>
  );
}
