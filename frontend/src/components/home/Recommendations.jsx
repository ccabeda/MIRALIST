import React from 'react';
import MediaCard from '../catalog/MediaCard.jsx';

export default function Recommendations({ recommendations, library, openTitle, add }) {
  return (
    <section className="recommendation-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SEGÚN LO QUE VISTE Y TUS FAVORITOS</span>
          <h2>Para tu próxima historia</h2>
        </div>
      </div>
      <div className="poster-grid">
        {recommendations.map(({ title, seed }) => (
          <div key={title.id}>
            <p className="recommendation-reason">
              Porque te gustó {seed.title} · {seed.metadata?.provider || 'Catálogo'}
            </p>
            <MediaCard title={title} entry={library[title.id]} onOpen={openTitle} onAdd={add} />
          </div>
        ))}
      </div>
    </section>
  );
}
