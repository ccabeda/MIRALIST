import React from 'react';

export default function CatalogCredits() {
  return (
    <details className="catalog-credits">
      <summary>Créditos de los catálogos</summary>
      <p>
        Anime:{' '}
        <a href="https://myanimelist.net" target="_blank" rel="noreferrer">
          MyAnimeList
        </a>
        , API oficial.
      </p>
      <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
        <img
          src="https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
          width="100"
          height="40"
          alt="TMDB"
          loading="lazy"
        />
      </a>
      <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </details>
  );
}
