import React, { useState } from 'react';
import { authAction } from '../../services/auth.js';
import AccountForm, { emailField, passwordFields } from './AccountForm.jsx';

export default function PasswordRecovery({ token = '', onBack }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  async function submit(values) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await authAction(token ? 'reset-password' : 'forgot-password', {
        ...values,
        token,
      });
      setMessage(
        token ? 'Contraseña actualizada. Ya podés iniciar sesión con la nueva.' : result.message,
      );
      setDone(true);
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Recuperar contraseña">
      <h3>{token ? 'Elegí una nueva contraseña' : 'Recuperar contraseña'}</h3>
      {!token && (
        <p className="muted">
          Ingresá el correo de tu cuenta para solicitar un enlace de recuperación.
        </p>
      )}
      {!done && (
        <AccountForm
          mode={token ? 'reset' : 'forgot'}
          fields={token ? passwordFields : [emailField]}
          label={token ? 'Guardar nueva contraseña' : 'Enviar enlace'}
          disabled={busy}
          onSubmit={submit}
        />
      )}
      {busy && <p role="status">Procesando…</p>}
      {error && (
        <p className="auth-field-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button className="text-button d-block mt-3" disabled={busy} onClick={onBack}>
        Volver a iniciar sesión
      </button>
    </section>
  );
}
