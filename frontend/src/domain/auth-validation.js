export function validateAuth({ nombre, email, password }, register) {
  const errors = {};
  if (register && !nombre.trim()) errors.nombre = 'Ingresá tu nombre.';
  if (!email.trim()) errors.email = 'Ingresá tu correo electrónico.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = 'Ingresá un correo válido, como nombre@ejemplo.com.';
  if (!password) errors.password = 'Ingresá tu contraseña.';
  else if (register && password.length < 12)
    errors.password = 'La contraseña debe tener al menos 12 caracteres.';
  return errors;
}
