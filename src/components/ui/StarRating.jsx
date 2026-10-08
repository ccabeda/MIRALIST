import React, { useId } from 'react';
import { formatStars } from '../../domain/library.js';

function StarGraphic({ fill }) {
  const clipId = useId();
  const shape =
    'M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26Z';
  return (
    <svg className="star-graphic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path className="star-empty" d={shape} />
      <path className="star-filled" d={shape} clipPath={`url(#${clipId})`} />
    </svg>
  );
}

function ratingLabel(value) {
  if (value === 1) return 'Media estrella';
  const whole = Math.floor(value / 2);
  return `${whole} ${whole === 1 ? 'estrella' : 'estrellas'}${value % 2 ? ' y media' : ''}`;
}

export function StarSummary({ score }) {
  return (
    <span
      className="star-summary"
      role="img"
      aria-label={`${formatStars(score)} de 5 estrellas`}
      title={`${formatStars(score)} de 5 estrellas`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <StarGraphic key={index} fill={Math.max(0, Math.min(1, score / 2 - index))} />
      ))}
    </span>
  );
}

export default function StarRating({ score, onChange, compact = false, label = 'Tu puntuación' }) {
  const groupName = useId();
  return (
    <fieldset className={`${compact ? 'compact-rating' : 'col-sm-6'} star-rating`}>
      <legend>{label}</legend>
      <div className="star-options">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="rating-star" key={index}>
            <StarGraphic fill={Math.max(0, Math.min(1, score / 2 - index))} />
            {[1, 2].map((half) => {
              const value = index * 2 + half;
              return (
                <label
                  key={value}
                  className={`star-half ${half === 2 ? 'right-half' : ''}`}
                  title={ratingLabel(value)}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={value}
                    checked={score === value}
                    onChange={() => onChange(value)}
                    aria-label={ratingLabel(value)}
                  />
                </label>
              );
            })}
          </span>
        ))}
      </div>
      <div className="star-rating-caption">
        <output aria-live="polite">
          {score ? `${formatStars(score)} de 5` : compact ? 'Sin nota' : 'Sin puntuar'}
        </output>
        {score > 0 && (
          <button type="button" onClick={() => onChange(0)}>
            {compact ? 'Quitar nota' : 'Quitar puntuación'}
          </button>
        )}
      </div>
    </fieldset>
  );
}
