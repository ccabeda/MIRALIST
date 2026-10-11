import React, { useEffect } from 'react';
import PasswordRecovery from './PasswordRecovery.jsx';
import { recoveryToken } from '../../domain/account-validation.js';
import useTheme from '../../hooks/useTheme.js';

export default function ResetPasswordPage({ hash }) {
  useTheme();
  const token = recoveryToken(hash);
  useEffect(() => {
    // Keep the one-time token out of subsequent navigation and referrers.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  const back = () => window.location.assign(window.location.pathname);
  return (
    <main className="recovery-page">
      <div className="recovery-card">
        <h1>MiráList.</h1>
        {token ? (
          <PasswordRecovery token={token} onBack={back} />
        ) : (
          <>
            <p role="alert">
              El enlace de recuperación no es válido. Solicitá uno nuevo desde Mi perfil.
            </p>
            <button className="btn btn-accent" onClick={back}>
              Volver a MiráList
            </button>
          </>
        )}
      </div>
    </main>
  );
}
