async function readResponse(response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(
      response.status === 429
        ? 'Demasiados intentos. Esperá un minuto y volvé a intentar.'
        : body?.title ||
          (response.status === 401
            ? 'Tu sesión venció. Volvé a iniciar sesión desde Mi perfil.'
            : 'No se pudo conectar con las cuentas. Comprobá que el backend esté iniciado.'),
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

export async function currentUser() {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (response.status === 401) return null;
  return readResponse(response);
}

export async function authAction(action, values = {}, userId) {
  const csrf = await readResponse(await fetch('/api/auth/csrf', { credentials: 'same-origin' }));
  return readResponse(
    await fetch(`/api/auth/${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf.token,
        ...(userId ? { 'X-Miralist-User': userId } : {}),
      },
      body: JSON.stringify(values),
    }),
  );
}
