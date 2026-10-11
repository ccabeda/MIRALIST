export function validateAccount(values, mode) {
  const errors = {};
  if (mode === 'profile') {
    if (!values.nombre?.trim()) errors.nombre = 'Ingresá tu nombre.';
    else if (values.nombre.trim().length > 40) errors.nombre = 'Usá hasta 40 caracteres.';
  }
  if (mode === 'profile' || mode === 'forgot') {
    if (!values.email?.trim()) errors.email = 'Ingresá tu correo electrónico.';
    else if (
      values.email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
    )
      errors.email = 'Ingresá un correo válido.';
  }
  if (mode === 'profile' || mode === 'password') {
    if (!values.passwordActual) errors.passwordActual = 'Ingresá tu contraseña actual.';
    else if (values.passwordActual.length > 128)
      errors.passwordActual = 'La contraseña es demasiado larga.';
  }
  if (mode === 'password' || mode === 'reset') {
    if (
      !values.passwordNueva ||
      values.passwordNueva.length < 12 ||
      values.passwordNueva.length > 128
    )
      errors.passwordNueva = 'Usá entre 12 y 128 caracteres.';
    else if (mode === 'password' && values.passwordNueva === values.passwordActual)
      errors.passwordNueva = 'Elegí una contraseña diferente de la actual.';
    if (!values.confirmacion || values.confirmacion !== values.passwordNueva)
      errors.confirmacion = 'Las contraseñas no coinciden.';
  }
  return errors;
}

export function recoveryToken(hash) {
  const match = /^#reset-password=([a-f0-9]{64})$/i.exec(hash);
  return match?.[1] || '';
}
