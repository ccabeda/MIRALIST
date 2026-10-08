import React from 'react';
import { seasonsFor, seasonProgress, updateSeason } from '../../domain/seasons.js';

export default function SeasonProgressEditor({ title, entry, onSave }) {
  const seasons = seasonsFor(title);
  const watched = seasonProgress(title, entry);
  return (
    <fieldset className="col-12 seasons-editor">
      <legend>Progreso por temporada</legend>
      {seasons.map((season) => (
        <label key={season.number}>
          {season.number === 0 ? 'Especiales' : `Temporada ${season.number}`}
          <input
            className="form-control"
            type="number"
            min="0"
            max={season.total}
            step="1"
            value={watched[season.number]}
            onChange={(event) =>
              onSave(updateSeason(title, entry, season.number, event.target.value))
            }
          />
          <small>de {season.total} capítulos</small>
        </label>
      ))}
      <p className="date-help">Se muestran las temporadas disponibles en el catálogo.</p>
    </fieldset>
  );
}
