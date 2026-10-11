import React, { useEffect, useRef } from 'react';
import AuthPanel from './AuthPanel.jsx';
import AccountSettings from '../account/AccountSettings.jsx';

export default function AccountControls({
  theme,
  setTheme,
  library,
  auth,
  panel,
  setPanel,
  loginReason,
}) {
  const name = auth.user?.nombre || '';
  const dialog = useRef(null);
  useEffect(() => {
    if (!panel) return;
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, [panel]);
  function open(value) {
    setPanel(value);
  }
  const initial = name.trim().slice(0, 1).toUpperCase();
  return (
    <>
      <button
        className="notification-bell profile-button"
        aria-label="Mi perfil"
        title={name || 'Mi perfil'}
        onClick={() => open('profile')}
      >
        {initial || (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
          </svg>
        )}
      </button>
      <button
        className="notification-bell"
        aria-label="Configuración"
        title="Configuración"
        onClick={() => open('settings')}
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
          <circle cx="12" cy="12" r="3" />
          <path
            strokeLinejoin="round"
            d="m9 3 1-2h4l1 2 2 1 2 0 2 3-1 2v4l1 2-2 3-2 0-2 1-1 2h-4l-1-2-2-1-2 0-2-3 1-2V9L3 7l2-3h2Z"
          />
        </svg>
      </button>
      {panel && (
        <dialog
          ref={dialog}
          className="notification-panel account-panel"
          aria-labelledby="account-heading"
          onCancel={() => setPanel(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPanel(null);
          }}
        >
          <div className="notification-content">
            <div className="notification-header">
              <h2 id="account-heading">{panel === 'profile' ? 'Mi perfil' : 'Configuración'}</h2>
              <button
                className="notification-close"
                aria-label="Cerrar panel"
                onClick={() => setPanel(null)}
              >
                ×
              </button>
            </div>
            {panel === 'profile' ? (
              <>
                {loginReason && (
                  <p>Iniciá sesión o creá tu cuenta para guardar tus obras y organizarlas.</p>
                )}
                <AuthPanel auth={auth} defaultName={name} />
                {auth.user && (
                  <p className="muted">
                    {Object.keys(library).length} obras en tu biblioteca ·{' '}
                    {Object.values(library).filter((item) => item.status === 'Viendo').length}{' '}
                    viendo
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="appearance-setting">
                  <div>
                    <strong>Apariencia</strong>
                    <p className="muted">Modo {theme === 'dark' ? 'oscuro' : 'claro'}</p>
                  </div>
                  <button
                    className={`tema-boton ${theme === 'dark' ? 'is-dark' : ''}`}
                    aria-pressed={theme === 'dark'}
                    aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  />
                </div>
                <AccountSettings auth={auth} />
                <p className="notification-footnote">
                  Tu biblioteca y carpetas se guardan en tu cuenta. Los avisos y la apariencia son
                  locales. Podés exportar tu biblioteca desde Copia de seguridad.
                </p>
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
