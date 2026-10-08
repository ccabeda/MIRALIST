import React, { useEffect, useRef, useState } from 'react';
import useNotifications from '../../hooks/useNotifications.js';
import { relativeNotificationDate } from '../../domain/notifications.js';
import RelatedCover from '../catalog/RelatedCover.jsx';

export default function Notifications({ titles, library, openTitle }) {
  const feed = useNotifications(titles, library);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const dialog = useRef(null);
  const unread = feed.items.filter((item) => !item.read).length;
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element.showModal();
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearInterval(timer);
      element.close();
    };
  }, [open]);
  return (
    <>
      <button
        className="notification-bell"
        aria-label={`Notificaciones, ${unread} sin leer`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="notification-panel"
          aria-labelledby="notification-heading"
          onCancel={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="notification-content">
            <div className="notification-header">
              <div>
                <span className="eyebrow">TU BIBLIOTECA AL DÍA</span>
                <h2 id="notification-heading">Notificaciones</h2>
              </div>
              <button
                className="notification-close"
                aria-label="Cerrar notificaciones"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="muted">Estrenos recientes y nuevas entregas de lo que seguís.</p>
            <div className="notification-actions">
              <button className="btn btn-outline-light" disabled={feed.busy} onClick={feed.refresh}>
                {feed.busy ? 'Consultando…' : feed.errors ? 'Reintentar' : 'Actualizar'}
              </button>
              <button
                className="btn btn-outline-light"
                disabled={!unread}
                onClick={() => feed.markRead()}
              >
                Marcar todas como leídas
              </button>
            </div>
            {feed.busy && <p role="status">Revisando tu biblioteca…</p>}
            {!!feed.errors && (
              <p role="alert">
                Algunas fuentes no respondieron. Conservamos tus avisos; podés reintentar.
              </p>
            )}
            {feed.saveFailed && (
              <p role="alert">No se pudieron guardar los avisos en este navegador.</p>
            )}
            {!feed.busy && !feed.errors && !feed.items.length && (
              <div className="notification-empty">
                <strong>No tenés avisos todavía</strong>
                <p>
                  Los capítulos de los últimos 7 días aparecen para los animes y series de tu
                  biblioteca, en cualquier estado. La primera consulta de animes relacionados sirve
                  de referencia para detectar nuevas entregas.
                </p>
              </div>
            )}
            <ul className="notification-list">
              {feed.items.map((item) => (
                <li key={item.id} className={item.read ? '' : 'is-unread'}>
                  <button
                    className="notification-item"
                    onClick={() => {
                      feed.markRead(item.id);
                      setOpen(false);
                      openTitle(item.title);
                    }}
                  >
                    <RelatedCover title={item.title} />
                    <span>
                      <strong>{item.message}</strong>
                      <small>
                        <time dateTime={item.date}>{relativeNotificationDate(item.date, now)}</time>{' '}
                        · {item.source}
                      </small>
                      {!item.read && <small className="notification-unread-label">Sin leer</small>}
                    </span>
                  </button>
                  {!item.read && (
                    <button
                      className="notification-read"
                      aria-label={`Marcar como leída: ${item.title.title}`}
                      onClick={() => feed.markRead(item.id)}
                    >
                      Marcar leída
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="notification-footnote">
              Se revisan al abrir MiráList o al tocar Actualizar. Los estrenos dependen del
              proveedor y pueden variar según tu plataforma. Se conservan los últimos 100 avisos.
            </p>
            {feed.checkedAt && (
              <small className="muted">
                Última revisión: {relativeNotificationDate(feed.checkedAt, now)}
              </small>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
