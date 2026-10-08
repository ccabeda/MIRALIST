import React, { useState } from 'react';
import { StarSummary } from '../ui/StarRating.jsx';

export default function MediaCard({ title: t, entry, onOpen, onAdd }) {
  const [failedCover, setFailedCover] = useState(null);
  const cover = t.cover;
  const showCover = cover && failedCover !== cover;
  return (
    <article className="media-card">
      <button
        className={`poster ${showCover ? 'has-cover' : ''}`}
        style={{ '--poster': t.color }}
        onClick={() => onOpen(t)}
        aria-label={`Abrir ficha de ${t.title}`}
      >
        {showCover && (
          <img
            className="poster-image"
            src={cover}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedCover(cover)}
          />
        )}
        <span className="format-tag">{t.format}</span>
        {entry?.favorite && (
          <span className="favorite-star" aria-label="Favorito">
            ★
          </span>
        )}
        <div className="poster-orbit" />
        <span className="poster-mark">{t.mark}</span>
        <span className="poster-title">{t.title}</span>
        <span className="poster-caption">{t.subtitle}</span>
        <span className="poster-open">VER FICHA ↗</span>
      </button>
      <div className="card-meta">
        <small>
          {t.category} <span>·</span> {t.year}
        </small>
        <button className="title-button" onClick={() => onOpen(t)}>
          {t.title}
        </button>
        <div className="card-bottom">
          {entry ? (
            <button className="saved-state" onClick={() => onOpen(t)}>
              <span /> {entry.status}
            </button>
          ) : (
            <button className="add-list" onClick={() => onAdd(t)}>
              + Agregar a mi lista
            </button>
          )}
          {entry?.score > 0 ? (
            <StarSummary score={entry.score} />
          ) : (
            <span className="no-score">Sin nota</span>
          )}
        </div>
      </div>
    </article>
  );
}
