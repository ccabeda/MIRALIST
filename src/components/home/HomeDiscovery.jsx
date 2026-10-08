import React from 'react';
import Recommendations from './Recommendations.jsx';
import UpcomingReleases from './UpcomingReleases.jsx';
import useRecommendations from '../../hooks/useRecommendations.js';

export default function HomeDiscovery({ titles, library, onTitles, openTitle, add }) {
  const { seeds, recommendations, result, refresh } = useRecommendations(titles, library, onTitles);
  return (
    <>
      <section className="recommendation-section" aria-label="Recomendaciones personales">
        {!seeds.length ? (
          <>
            <h2>Para tu próxima historia</h2>
            <p className="muted">
              Marcá favoritos o completá una obra para recibir recomendaciones del catálogo.
            </p>
          </>
        ) : (
          <>
            <Recommendations
              recommendations={recommendations}
              library={library}
              openTitle={openTitle}
              add={add}
            />
            {!result && <p role="status">Buscando recomendaciones para vos…</p>}
            {result && !result.errors && !recommendations.length && (
              <p className="muted">No hay nuevas recomendaciones disponibles entre estas obras.</p>
            )}
          </>
        )}
        {!!result?.errors && (
          <p role="alert">Algunas obras no pudieron actualizarse. Podés volver a intentar.</p>
        )}
        {seeds.length > 0 && (
          <button className="btn btn-outline-light" onClick={refresh} disabled={!result}>
            {!result
              ? 'Cargando recomendaciones…'
              : result.errors
                ? 'Reintentar recomendaciones'
                : 'Actualizar recomendaciones'}
          </button>
        )}
      </section>
      <UpcomingReleases
        titles={titles}
        library={library}
        openTitle={openTitle}
        onTitles={onTitles}
      />
    </>
  );
}
