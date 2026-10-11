import React, { useState } from 'react';
import AccountForm, { currentPasswordField, emailField, passwordFields } from './AccountForm.jsx';
import { EmailStatus } from './EmailVerification.jsx';

export default function AccountSettings({ auth }) {
  const [view, setView] = useState('profile');
  const [message, setMessage] = useState('');
  if (!auth.user)
    return <p className="muted">Iniciá sesión desde Mi perfil para editar tu cuenta.</p>;
  const disabled = auth.busy || auth.pendingChanges || auth.sessionExpired;
  return (
    <section className="account-settings" aria-label="Configuración de cuenta">
      <h3>Tu cuenta</h3>
      <div className="account-tabs" aria-label="Opciones de cuenta">
        <button
          className="text-button"
          aria-pressed={view === 'profile'}
          onClick={() => {
            setView('profile');
            setMessage('');
          }}
        >
          Editar perfil
        </button>
        <button
          className="text-button"
          aria-pressed={view === 'password'}
          onClick={() => {
            setView('password');
            setMessage('');
          }}
        >
          Cambiar contraseña
        </button>
        <button
          className="text-button"
          aria-pressed={view === 'sessions'}
          onClick={() => {
            setView('sessions');
            setMessage('');
          }}
        >
          Sesiones
        </button>
      </div>
      {auth.pendingChanges && (
        <p role="status">Esperá a que se guarden los cambios de tu biblioteca.</p>
      )}
      {auth.sessionExpired && (
        <p role="alert">Volvé a iniciar sesión desde Mi perfil antes de editar tu cuenta.</p>
      )}
      {view === 'profile' && (
        <>
          <p className="muted">
            El correo actual se conserva hasta confirmar el nuevo mediante un enlace. Al confirmar
            el cambio se cerrarán las sesiones y se invalidarán los enlaces de recuperación
            anteriores.
          </p>
          <EmailStatus auth={auth} />
          <AccountForm
            key={`profile-${auth.user.id}`}
            mode="profile"
            initial={{
              nombre: auth.user.nombre,
              email: auth.user.emailPendiente || auth.user.email,
            }}
            fields={[
              { name: 'nombre', label: 'Nombre', autoComplete: 'name', maxLength: 40 },
              emailField,
              currentPasswordField,
            ]}
            label="Guardar perfil"
            disabled={disabled}
            onSubmit={async (values) => {
              setMessage('');
              const ok = await auth.submit('profile', values);
              if (ok) setMessage('Perfil actualizado.');
              return ok;
            }}
          />
        </>
      )}
      {view === 'password' && (
        <AccountForm
          key="password"
          mode="password"
          fields={[currentPasswordField, ...passwordFields]}
          label="Cambiar contraseña"
          disabled={disabled}
          onSubmit={(values) => auth.submit('change-password', values)}
        />
      )}
      {view === 'sessions' && (
        <>
          <p>
            Se cerrarán todas las sesiones de tu cuenta, incluida la que estás usando ahora. Tu
            biblioteca se conserva.
          </p>
          <button
            className="btn btn-outline-light"
            disabled={disabled}
            onClick={() => auth.submit('logout-all')}
          >
            Cerrar todas las sesiones
          </button>
        </>
      )}
      {auth.busy && <p role="status">Guardando…</p>}
      {auth.error && <p role="alert">{auth.error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
