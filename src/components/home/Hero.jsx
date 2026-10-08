import React from 'react';

export default function Hero({ navigate, titles }) {
  const covers = titles.filter((title) => title.cover).slice(0, 3);
  return (
    <section className="hero">
      <div className="hero-art" aria-hidden="true">
        {covers.map((title, index) => (
          <img
            key={title.id}
            className={`hero-cover ${['cover-one', 'cover-two', 'cover-three'][index]}`}
            src={title.cover}
            decoding="async"
            referrerPolicy="no-referrer"
            alt=""
          />
        ))}
      </div>
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="hero-kicker-line" /> TU HISTORIA NO TERMINA EN LOS CRÉDITOS
        </span>
        <h1>
          Miralo.
          <br />
          Vivilo.
          <br />
          <span>Guardalo.</span>
        </h1>
        <p>
          Ese anime que te marcó. La serie que no podés soltar.
          <br className="desktop-break" /> Todo lo que ves, en un solo lugar.
        </p>
        <div className="hero-actions">
          <button className="btn btn-accent" onClick={() => navigate('Mi biblioteca')}>
            MI BIBLIOTECA <span>↗</span>
          </button>
          <button className="hero-secondary" onClick={() => navigate('Anime')}>
            EXPLORAR ANIME <span>→</span>
          </button>
        </div>
        <div className="hero-categories">
          ANIME <span>✦</span> SERIES <span>✦</span> PELÍCULAS
        </div>
      </div>
      <span className="hero-footnote">MUCHAS HISTORIAS. UNA SOLA LISTA.</span>
    </section>
  );
}
