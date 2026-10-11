import React, { useEffect, useState } from 'react';
import { authAction } from '../../services/auth.js';
import useTheme from '../../hooks/useTheme.js';

export function EmailStatus({ auth }) {
  const [message, setMessage] = useState('');
  if (!auth.user) return null;
  const pending = auth.user.emailPendiente;
  if (auth.user.emailVerificado && !pending) return <p className="muted">Correo verificado ✓</p>;
  return (
    <section aria-label="Verificación del correo" className="mb-3">
      {auth.user.avisoCorreo && <p role="alert">{auth.user.avisoCorreo}</p>}
      <p>
        {pending
          ? `Confirmá ${pending} para completar el cambio. Hasta entonces usá ${auth.user.email}.`
          : 'Tu correo todavía no está verificado. Revisá tu bandeja de entrada y spam.'}
      </p>
      <button
        className="text-button"
        disabled={auth.busy || auth.sessionExpired}
        onClick={async () => {
          setMessage('');
          if (await auth.submit('resend-verification'))
            setMessage('Enlace enviado. Revisá tu correo.');
        }}
      >
        Reenviar verificación
      </button>
      <button className="text-button d-block mt-2" disabled={auth.busy} onClick={auth.refresh}>
        Ya lo verifiqué: actualizar
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export default function EmailVerificationPage({ hash }) {
  useTheme();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const token = /^#verify-email=([a-f0-9]{64})$/i.exec(hash)?.[1];
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  return (
    <main className="recovery-page">
      <div className="recovery-card">
        <h1>MiráList.</h1>
        <h2>Verificar correo</h2>
        {done ? (
          <p role="status">
            Correo verificado. Si cambiaste tu dirección, iniciá sesión con el nuevo correo.
          </p>
        ) : token ? (
          <>
            <p>Confirmá que querés usar esta dirección en tu cuenta.</p>
            <button
              className="btn btn-accent"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await authAction('verify-email', { token });
                  setDone(true);
                } catch (failure) {
                  setError(failure.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Verificando…' : 'Confirmar correo'}
            </button>
          </>
        ) : (
          <p role="alert">El enlace no es válido. Pedí otro desde Mi perfil.</p>
        )}
        {error && <p role="alert">{error}</p>}
        <button
          className="text-button d-block mt-3"
          onClick={() => window.location.assign(window.location.pathname)}
        >
          Volver a MiráList
        </button>
      </div>
    </main>
  );
}
