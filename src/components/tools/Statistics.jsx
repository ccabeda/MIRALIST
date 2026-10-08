import React, { useState } from 'react';
import { libraryStats } from '../../domain/statistics.js';
import { localToday } from '../../domain/watch-dates.js';

export default function Statistics({ titles, library }) {
  const [range, setRange] = useState('all');
  const [year, setYear] = useState(localToday().slice(0, 4));
  const [month, setMonth] = useState(localToday().slice(5, 7));
  const period = range === 'all' ? '' : range === 'year' ? year : `${year}-${month}`;
  const stats = libraryStats(titles, library, period);
  const years = [...new Set([localToday().slice(0, 4), ...stats.years])].sort().reverse();
  return (
    <>
      <p>Tu colección, en números.</p>
      <div className="tools-filters">
        <label>
          Período
          <select className="form-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="all">Todo el tiempo</option>
            <option value="year">Por año</option>
            <option value="month">Por mes</option>
          </select>
        </label>
        {range !== 'all' && (
          <label>
            Año
            <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
        {range === 'month' && (
          <label>
            Mes
            <select
              className="form-select"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>
                  {new Date(2020, i, 1).toLocaleString('es', { month: 'long' })}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="personal-stats" aria-live="polite">
        <article>
          <strong>{stats.chapters}</strong>
          <span>
            {period ? 'Capítulos de obras terminadas en el período' : 'Capítulos vistos acumulados'}
          </span>
        </article>
        <article>
          <strong>{stats.completed}</strong>
          <span>Anime y series terminados{period ? ' en el período' : ''}</span>
        </article>
        <article>
          <strong>{stats.movies}</strong>
          <span>Películas vistas{period ? ' en el período' : ' · total histórico'}</span>
        </article>
        <article>
          <strong>
            {stats.average === null
              ? '—'
              : `${stats.average.toLocaleString('es', { maximumFractionDigits: 1 })} ★`}
          </strong>
          <span>
            Media sobre 5 · {stats.rated} obras puntuadas
            {period ? ' y terminadas en el período' : ''}
          </span>
        </article>
      </div>
      <p className="tools-help">
        El mes y el año se basan en cuándo terminaste el anime o serie y cuándo viste la película.
        Los capítulos se agrupan por obra terminada; las estrellas muestran tu puntuación actual de
        esas obras.
      </p>
      {stats.undated > 0 && (
        <p className="tools-help">
          {stats.undated} obras terminadas sin fecha aparecen solo en «Todo el tiempo».
        </p>
      )}
    </>
  );
}
