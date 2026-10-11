import { useCallback, useEffect, useState } from 'react';
import { authAction, currentUser } from '../services/auth.js';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setUser(await currentUser());
    } catch {
      setError('No se pudo consultar tu cuenta. Iniciá el backend y reintentá.');
    } finally {
      setBusy(false);
      setReady(true);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  async function submit(action, values) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await authAction(action, values, user?.id);
      setSessionExpired(false);
      if (['login', 'register', 'profile'].includes(action)) setUser(result);
      if (result?.avisoCorreo) setMessage(result.avisoCorreo);
      if (action === 'resend-verification') {
        setUser((previous) => previous && { ...previous, avisoCorreo: null });
        setMessage('Enlace enviado. Revisá tu correo y la carpeta de spam.');
      }
      if (['logout', 'logout-all', 'change-password', 'reset-password'].includes(action))
        setUser(null);
      if (action === 'change-password')
        setMessage(
          'Contraseña actualizada. Se cerraron todas las sesiones; volvé a entrar con la nueva.',
        );
      if (action === 'logout-all') setMessage('Se cerraron todas las sesiones, incluida esta.');
      return true;
    } catch (failure) {
      if (user && failure.status === 401) setSessionExpired(true);
      setError(failure.message || 'No se pudo completar la operación.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    user,
    busy,
    ready,
    error,
    message,
    sessionExpired,
    clearMessage: () => setMessage(''),
    refresh,
    submit,
  };
}
