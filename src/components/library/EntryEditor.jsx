import React from 'react';
import { isMovie, statuses, hasKnownTotal } from '../../domain/library.js';
import { seasonsFor } from '../../domain/seasons.js';
import StarRating from '../ui/StarRating.jsx';
import { WatchDates, MovieDate } from './WatchDates.jsx';
import SeasonProgressEditor from './SeasonProgressEditor.jsx';
import { releaseLimits } from '../../domain/release-limits.js';

export default function EntryEditor({
  title,
  entry,
  onSave,
  onRemove,
  suggestion,
  onAcceptDate,
  onDismissDate,
}) {
  const movie = isMovie(title);
  const seasons = seasonsFor(title);
  const limits = releaseLimits(title);
  return (
    <div className="detail-form">
      <div className="row g-3">
        <label className="col-sm-6">
          Estado
          <select
            className="form-select"
            value={entry.status}
            onChange={(event) => onSave({ status: event.target.value })}
          >
            {statuses.map((status) => (
              <option key={status} disabled={!limits.statuses.includes(status)}>
                {status}
              </option>
            ))}
          </select>
        </label>
        {movie ? (
          <div className="col-sm-6 movie-progress">
            <label>
              <input
                type="checkbox"
                disabled={limits.unreleased}
                checked={entry.status === 'Completado'}
                onChange={(event) =>
                  onSave({
                    status: event.target.checked ? 'Completado' : 'Pendiente',
                  })
                }
              />{' '}
              Película vista
            </label>
          </div>
        ) : seasons.length ? (
          <div className="col-sm-6 season-total">
            <strong>
              {entry.progress} / {title.total ?? '?'}
            </strong>
            <small>capítulos vistos en total</small>
          </div>
        ) : (
          <label className="col-sm-6">
            Capítulos vistos
            <input
              className="form-control"
              type="number"
              min="0"
              max={limits.max}
              disabled={limits.unreleased}
              step="1"
              value={entry.progress}
              aria-describedby="chapter-total"
              onChange={(event) => {
                if (event.target.value !== '') onSave({ progress: Number(event.target.value) });
              }}
            />
            <small id="chapter-total" className="chapter-total">
              {hasKnownTotal(title.total)
                ? `de ${title.total} ${title.total === 1 ? 'capítulo' : 'capítulos'}`
                : 'Total de capítulos desconocido'}
            </small>
          </label>
        )}
        {!!seasons.length && <SeasonProgressEditor title={title} entry={entry} onSave={onSave} />}
        {(limits.unreleased || title.metadata?.status === 'En emisión') && (
          <p className="col-12 date-help" role="status">
            {limits.unreleased
              ? 'Todavía no se estrenó. Solo podés guardarlo como Pendiente.'
              : limits.confirmed
                ? `Podés marcar hasta ${limits.max} capítulos emitidos. No se puede completar mientras siga en emisión.`
                : 'No se pudo confirmar cuántos capítulos salieron. Se mantiene el límite del catálogo; no se puede completar mientras siga en emisión.'}
          </p>
        )}
        <StarRating score={entry.score} onChange={(score) => onSave({ score })} />
        {suggestion && (
          <div className="col-12">
            <div className="date-suggestion" role="status">
              <span>
                {movie
                  ? '¿La viste hoy?'
                  : suggestion.field === 'startDate'
                    ? '¿La empezaste hoy?'
                    : '¿La terminaste hoy?'}
              </span>
              <button className="text-button" onClick={onAcceptDate}>
                Usar hoy
              </button>
              <button className="text-button" onClick={onDismissDate}>
                Omitir
              </button>
            </div>
          </div>
        )}
        {movie ? (
          <MovieDate entry={entry} onSave={onSave} />
        ) : (
          <WatchDates entry={entry} onSave={onSave} />
        )}
        <label className="col-12">
          Notas personales
          <textarea
            className="form-control"
            rows="3"
            maxLength="2000"
            placeholder="¿Qué te está pareciendo?"
            value={entry.notes || ''}
            onChange={(event) => onSave({ notes: event.target.value })}
          />
        </label>
      </div>
      <div className="detail-footer">
        <small>Guardado automático en este navegador</small>
        <button className="remove-button" onClick={onRemove}>
          Quitar de mi lista
        </button>
      </div>
    </div>
  );
}
