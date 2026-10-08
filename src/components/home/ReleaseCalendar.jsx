import React, { useState } from 'react';
import useReleaseCalendar from '../../hooks/useReleaseCalendar.js';
import { groupCalendarEvents } from '../../domain/release-calendar.js';
import { months, monthCells, shiftMonth, displayDate } from '../../domain/calendar.js';
import { localToday } from '../../domain/watch-dates.js';
import RelatedCover from '../catalog/RelatedCover.jsx';

export default function ReleaseCalendar({ titles, library, openTitle }) {
  const today = localToday();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [category, setCategory] = useState('Todos');
  const feed = useReleaseCalendar(titles, library);
  const grouped = groupCalendarEvents(feed.events, category);
  const dates = Object.keys(grouped).sort();
  const next = dates.find((date) => date >= today);
  const selectedEvents = grouped[selected] || [];
  function select(date) {
    setSelected(date);
    setMonth(date.slice(0, 7));
  }
  function navigate(amount) {
    const nextMonth = shiftMonth(month, amount);
    select(dates.find((date) => date.startsWith(nextMonth)) || `${nextMonth}-01`);
  }
  return (
    <section className="release-calendar" aria-label="Calendario de estrenos">
      <div className="release-calendar-heading">
        <div>
          <span className="eyebrow">LO QUE VIENE EN TU LISTA</span>
          <h1>Calendario de estrenos</h1>
          <p className="muted">Los próximos capítulos de tu biblioteca, en todos los estados.</p>
        </div>
        <button className="btn btn-outline-light" disabled={feed.loading} onClick={feed.refresh}>
          {feed.loading
            ? 'Consultando fechas…'
            : feed.errors
              ? 'Reintentar fechas'
              : 'Actualizar fechas'}
        </button>
      </div>
      <p className="release-calendar-coverage">
        Anime: semana actual y siguiente, con fechas en tu zona horaria. Series: próximo episodio
        informado por TMDB. Las fechas pueden cambiar.
      </p>
      <div className="release-calendar-toolbar">
        <label>
          Mostrar
          <select
            className="form-select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>Todos</option>
            <option>Anime</option>
            <option>Series</option>
          </select>
        </label>
        <button className="btn btn-outline-light" onClick={() => select(today)}>
          Hoy
        </button>
        {next && (
          <button className="btn btn-outline-light" onClick={() => select(next)}>
            Ir al próximo estreno
          </button>
        )}
      </div>
      {feed.loading && <p role="status">Consultando fechas de tu biblioteca…</p>}
      {!!feed.errors && (
        <p role="alert">
          No pudimos consultar {feed.errors} obras. Podés volver a intentar; las fechas disponibles
          pueden estar incompletas.
        </p>
      )}
      {!feed.loading && !feed.total && (
        <p>Agregá animes o series a tu biblioteca para ver sus próximos capítulos.</p>
      )}
      {!feed.loading && !feed.errors && feed.total > 0 && !dates.length && (
        <p>
          No hay fechas disponibles para este filtro. Esto no significa que tus obras hayan
          terminado.
        </p>
      )}
      <div className="release-calendar-layout">
        <div className="release-calendar-month">
          <div className="release-month-heading">
            <button aria-label="Mes anterior" onClick={() => navigate(-1)}>
              ‹
            </button>
            <h2 aria-live="polite">
              {months[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
            </h2>
            <button aria-label="Mes siguiente" onClick={() => navigate(1)}>
              ›
            </button>
          </div>
          <div className="release-calendar-weekdays" aria-hidden="true">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="release-calendar-days">
            {monthCells(month).map((day) => {
              const count = grouped[day.iso]?.length || 0;
              return (
                <button
                  key={day.iso}
                  className={`${day.inMonth ? '' : 'outside-month'} ${day.iso === today ? 'is-today' : ''}`}
                  aria-pressed={day.iso === selected}
                  aria-current={day.iso === today ? 'date' : undefined}
                  aria-label={`${displayDate(day.iso)}${count ? `, ${count} ${count === 1 ? 'estreno' : 'estrenos'}` : ', sin fechas disponibles'}`}
                  onClick={() => select(day.iso)}
                >
                  <span>{day.day}</span>
                  {count > 0 && (
                    <small>
                      {count}
                      <span className="release-count-label">
                        {' '}
                        {count === 1 ? 'estreno' : 'estrenos'}
                      </span>
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <section className="release-calendar-agenda" aria-label="Estrenos del día">
          <span className="eyebrow">EN TU CALENDARIO</span>
          <h2>{displayDate(selected)}</h2>
          {!selectedEvents.length && (
            <p className="muted">
              {feed.loading
                ? 'Buscando fechas…'
                : feed.errors
                  ? 'No pudimos confirmar todas las fechas. Reintentá la consulta.'
                  : 'Sin capítulos con fecha disponible para este día.'}
            </p>
          )}
          <div className="related-grid">
            {selectedEvents.map((event) => (
              <button key={event.id} onClick={() => openTitle(event.title)}>
                <RelatedCover title={event.title} />
                <span>
                  <strong>{event.title.title}</strong>
                  <small>{event.label}</small>
                  <small>
                    {event.note} · {event.source}
                  </small>
                  <small>{library[event.title.id]?.status}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <p className="release-calendar-coverage">
        Fuentes:{' '}
        <a href="https://animeschedule.net" target="_blank" rel="noreferrer">
          AnimeSchedule
        </a>{' '}
        y{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          TMDB
        </a>
        . Solo mostramos fechas proporcionadas por los catálogos.
      </p>
    </section>
  );
}
