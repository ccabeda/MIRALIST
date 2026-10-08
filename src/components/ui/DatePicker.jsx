import React, { useEffect, useId, useRef, useState } from 'react';
import { localToday } from '../../domain/watch-dates.js';
import {
  months,
  monthCells,
  shiftDay,
  shiftMonth,
  dateAllowed,
  displayDate,
} from '../../domain/calendar.js';

export default function DatePicker({ label, value, onChange, min, max, describedBy, invalid }) {
  const id = useId();
  const dialog = useRef(null),
    trigger = useRef(null),
    grid = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('');
  const [focused, setFocused] = useState('');
  const [choosingMonth, setChoosingMonth] = useState(false);
  const [year, setYear] = useState('');
  const today = localToday();
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  useEffect(() => {
    if (open && !choosingMonth) grid.current?.querySelector(`[data-day="${focused}"]`)?.focus();
  }, [open, focused, view, choosingMonth]);
  function show() {
    let initial = value || today;
    if (min && initial < min) initial = min;
    if (max && initial > max) initial = max;
    setView(initial.slice(0, 7));
    setFocused(initial);
    setYear(initial.slice(0, 4));
    setChoosingMonth(false);
    setOpen(true);
  }
  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  function select(date) {
    if (!date || dateAllowed(date, min, max)) {
      onChange(date);
      close();
    }
  }
  function navigate(amount) {
    const next = shiftMonth(view, amount);
    setView(next);
    setYear(next.slice(0, 4));
    const first = monthCells(next).find((day) => day.inMonth && dateAllowed(day.iso, min, max));
    setFocused(first?.iso || `${next}-01`);
  }
  function keyDown(event, date) {
    const shifts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (Object.hasOwn(shifts, event.key)) {
      event.preventDefault();
      let next = shiftDay(date, shifts[event.key]);
      if (min && next < min) next = min;
      if (max && next > max) next = max;
      setFocused(next);
      setView(next.slice(0, 7));
      setYear(next.slice(0, 4));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      navigate((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
    }
  }
  const monthNumber = Number(view.slice(5, 7)) - 1;
  const cells = view ? monthCells(view) : [];
  const title = view ? `${months[monthNumber]} ${view.slice(0, 4)}` : '';
  const chosenYear = Math.max(
    1,
    Math.min(9999, Math.trunc(Number(year)) || Number(view.slice(0, 4)) || 1),
  );
  return (
    <div className="custom-date-field">
      <span id={`${id}-label`} className="date-field-label">
        {label}
      </span>
      <button
        type="button"
        ref={trigger}
        className={`date-trigger ${value ? 'has-date' : ''}`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onClick={show}
      >
        <span id={`${id}-value`}>{displayDate(value)}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        className="calendar-dialog"
        aria-labelledby={`${id}-heading`}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) close();
        }}
      >
        {open && (
          <>
            <div className="calendar-top">
              <div>
                <span className="calendar-kicker">GUARDÁ EL MOMENTO</span>
                <h3 id={`${id}-heading`}>{label}</h3>
              </div>
              <button className="calendar-close" aria-label="Cerrar calendario" onClick={close}>
                ×
              </button>
            </div>
            <div className="calendar-nav">
              <button
                aria-label="Mes anterior"
                onClick={() => navigate(-1)}
                disabled={view === '0001-01'}
              >
                ‹
              </button>
              <button
                className="calendar-month-title"
                aria-expanded={choosingMonth}
                onClick={() => setChoosingMonth(!choosingMonth)}
              >
                {title}
                <span aria-hidden="true">⌄</span>
              </button>
              <button
                aria-label="Mes siguiente"
                onClick={() => navigate(1)}
                disabled={view === '9999-12'}
              >
                ›
              </button>
            </div>
            {choosingMonth ? (
              <div className="calendar-month-picker">
                <div className="calendar-year">
                  <button
                    aria-label="Año anterior"
                    disabled={chosenYear === 1}
                    onClick={() => setYear(String(chosenYear - 1))}
                  >
                    −
                  </button>
                  <label>
                    Año
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      step="1"
                      value={year}
                      onChange={(event) => setYear(event.target.value)}
                      onBlur={() => setYear(String(chosenYear))}
                    />
                  </label>
                  <button
                    aria-label="Año siguiente"
                    disabled={chosenYear === 9999}
                    onClick={() => setYear(String(chosenYear + 1))}
                  >
                    +
                  </button>
                </div>
                <div className="calendar-months">
                  {months.map((month, index) => (
                    <button
                      key={month}
                      aria-pressed={
                        index === monthNumber && chosenYear === Number(view.slice(0, 4))
                      }
                      onClick={() => {
                        const next = `${String(chosenYear).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`;
                        setView(next);
                        setFocused(
                          monthCells(next).find(
                            (day) => day.inMonth && dateAllowed(day.iso, min, max),
                          )?.iso || `${next}-01`,
                        );
                        setChoosingMonth(false);
                      }}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="calendar-week" aria-hidden="true">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div ref={grid} className="calendar-days" role="group" aria-label={title}>
                  {cells.map((day) => (
                    <button
                      key={day.iso}
                      data-day={day.iso}
                      className={`${day.inMonth ? '' : 'outside-month'} ${day.iso === today ? 'is-today' : ''} ${day.iso === value ? 'is-selected' : ''}`}
                      aria-label={displayDate(day.iso)}
                      aria-pressed={day.iso === value}
                      aria-current={day.iso === today ? 'date' : undefined}
                      disabled={!dateAllowed(day.iso, min, max)}
                      tabIndex={day.iso === focused ? 0 : -1}
                      onKeyDown={(event) => keyDown(event, day.iso)}
                      onClick={() => select(day.iso)}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
                <div className="calendar-legend">
                  <span /> Hoy <span className="selected-marker" /> Seleccionado
                </div>
              </>
            )}
            {(min || max) && (
              <p className="calendar-limit">
                {min ? `Desde el ${displayDate(min)}. ` : ''}
                {max ? `Hasta el ${displayDate(max)}.` : ''}
              </p>
            )}
            <div className="calendar-footer">
              <button className="calendar-clear" disabled={!value} onClick={() => select('')}>
                Borrar fecha
              </button>
              <button
                className="calendar-today"
                disabled={!dateAllowed(today, min, max)}
                onClick={() => select(today)}
              >
                Usar hoy
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
