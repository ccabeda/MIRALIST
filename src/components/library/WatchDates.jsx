import React, { useEffect, useState } from 'react';
import { validateWatchDates } from '../../domain/library.js';
import DatePicker from '../ui/DatePicker.jsx';

export function WatchDates({ entry, onSave }) {
  const [dates, setDates] = useState({
    startDate: entry.startDate || '',
    finishDate: entry.finishDate || '',
  });
  useEffect(() => {
    setDates({ startDate: entry.startDate || '', finishDate: entry.finishDate || '' });
  }, [entry.startDate, entry.finishDate]);
  const error = validateWatchDates(dates.startDate, dates.finishDate);
  function changeDate(field, value) {
    const next = { ...dates, [field]: value };
    setDates(next);
    if (!validateWatchDates(next.startDate, next.finishDate)) onSave(next);
  }
  return (
    <fieldset className="col-12 watch-dates">
      <legend>Tu recorrido</legend>
      <div className="row g-3">
        <div className="col-sm-6">
          <DatePicker
            label="Fecha de inicio"
            value={dates.startDate}
            max={dates.finishDate || undefined}
            onChange={(value) => changeDate('startDate', value)}
            invalid={!!error}
            describedBy={error ? 'watch-dates-error' : 'watch-dates-help'}
          />
        </div>
        <div className="col-sm-6">
          <DatePicker
            label="Fecha de finalización"
            value={dates.finishDate}
            min={dates.startDate || undefined}
            onChange={(value) => changeDate('finishDate', value)}
            invalid={!!error}
            describedBy={error ? 'watch-dates-error' : 'watch-dates-help'}
          />
        </div>
      </div>
      {error ? (
        <p id="watch-dates-error" className="date-error" role="alert">
          {error} Corregí las fechas para guardarlas.
        </p>
      ) : (
        <p id="watch-dates-help" className="date-help">
          Opcionales. Podés dejarlas vacías si no recordás el día.
        </p>
      )}
    </fieldset>
  );
}

export function MovieDate({ entry, onSave }) {
  const [date, setDate] = useState(entry.watchedDate || '');
  useEffect(() => setDate(entry.watchedDate || ''), [entry.watchedDate]);
  const error = validateWatchDates('', date);
  function change(value) {
    setDate(value);
    if (!validateWatchDates('', value)) onSave({ watchedDate: value });
  }
  return (
    <div className="col-12">
      <DatePicker
        label="Cuándo la viste"
        value={date}
        onChange={change}
        invalid={!!error}
        describedBy="movie-date-help"
      />
      <small id="movie-date-help" className={error ? 'date-error' : 'date-help'}>
        {error || 'Opcional. Una sola fecha para recordar cuándo viste la película.'}
      </small>
    </div>
  );
}
