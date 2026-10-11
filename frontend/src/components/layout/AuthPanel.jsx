import React, { useState } from 'react';
import { validateAuth } from '../../domain/auth-validation.js';
import PasswordRecovery from '../account/PasswordRecovery.jsx';
import { EmailStatus } from '../account/EmailVerification.jsx';

export default function AuthPanel({ auth, defaultName }) {
  const [register, setRegister] = useState(false);
  const [nombre, setNombre] = useState(defaultName || '');
  const [email, setEmail] = useState(auth.user?.email || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [forgot, setForgot] = useState(false);
  function clearError(field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }
  if (forgot) return <PasswordRecovery onBack={() => setForgot(false)} />;
  return (
    <section aria-label="Cuenta de MiráList">
      {auth.user && !auth.sessionExpired ? (
        <>
          <p>
            Hola, <strong>{auth.user.nombre}</strong>.
          </p>
          <p className="muted">{auth.user.email}</p>
          <EmailStatus auth={auth} />
          <button
            className="btn btn-outline-light"
            disabled={auth.busy || auth.pendingChanges}
            onClick={() => auth.submit('logout')}
          >
            Cerrar sesión
          </button>
          {auth.pendingChanges && (
            <p role="status">Guardá los cambios pendientes antes de cerrar sesión.</p>
          )}
        </>
      ) : (
        <form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            const validation = validateAuth({ nombre, email, password }, register);
            setErrors(validation);
            const first = Object.keys(validation)[0];
            if (first) {
              event.currentTarget.elements.namedItem(first)?.focus();
              return;
            }
            if (
              await auth.submit(register ? 'register' : 'login', {
                nombre,
                email: auth.user?.email || email,
                password,
              })
            ) {
              setPassword('');
              if (auth.user) auth.onReauthenticated();
            }
          }}
        >
          <fieldset className="border-0 p-0 m-0" disabled={auth.busy}>
            <h3>
              {auth.user ? 'Volver a iniciar sesión' : register ? 'Crear cuenta' : 'Iniciar sesión'}
            </h3>
            {register && (
              <label className="d-block mb-3">
                Nombre
                <input
                  className="form-control"
                  autoComplete="name"
                  name="nombre"
                  aria-invalid={!!errors.nombre}
                  aria-describedby={errors.nombre ? 'auth-name-error' : undefined}
                  required
                  maxLength={40}
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    clearError('nombre');
                  }}
                />
                {errors.nombre && (
                  <small id="auth-name-error" className="auth-field-error" role="alert">
                    {errors.nombre}
                  </small>
                )}
              </label>
            )}
            <label className="d-block mb-3">
              Correo electrónico
              <input
                className="form-control"
                type="email"
                autoComplete="email"
                name="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'auth-email-error' : undefined}
                required
                maxLength={254}
                value={auth.user?.email || email}
                readOnly={!!auth.user}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError('email');
                }}
              />
              {errors.email && (
                <small id="auth-email-error" className="auth-field-error" role="alert">
                  {errors.email}
                </small>
              )}
            </label>
            <label className="d-block mb-3">
              Contraseña
              <input
                className="form-control"
                type="password"
                name="password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'auth-password-error' : undefined}
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 12 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError('password');
                }}
              />
              {errors.password && (
                <small id="auth-password-error" className="auth-field-error" role="alert">
                  {errors.password}
                </small>
              )}
            </label>
            {register && <p className="muted">Usá una contraseña de entre 12 y 128 caracteres.</p>}
            <button className="btn btn-accent" type="submit">
              {register ? 'Crear cuenta' : 'Entrar'}
            </button>
            {!auth.user && (
              <button
                className="text-button d-block mt-3"
                type="button"
                onClick={() => {
                  setRegister(!register);
                  setPassword('');
                  setErrors({});
                }}
              >
                {register ? 'Ya tengo cuenta' : 'Crear una cuenta'}
              </button>
            )}
            {!register && (
              <button
                className="text-button d-block mt-3"
                type="button"
                onClick={() => setForgot(true)}
              >
                Olvidé mi contraseña
              </button>
            )}
          </fieldset>
        </form>
      )}
      {auth.busy && <p role="status">Consultando cuenta…</p>}
      {auth.error && (
        <div role="alert">
          <p>{auth.error}</p>
          <button className="text-button" disabled={auth.busy} onClick={auth.refresh}>
            Reintentar conexión
          </button>
        </div>
      )}
      <p className="notification-footnote mt-3">
        Tu biblioteca y carpetas se guardan en tu cuenta.
      </p>
    </section>
  );
}
