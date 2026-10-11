import React, { useId, useState } from 'react';
import { validateAccount } from '../../domain/account-validation.js';

export const passwordFields = [
  {
    name: 'passwordNueva',
    label: 'Nueva contraseña',
    type: 'password',
    autoComplete: 'new-password',
    maxLength: 128,
  },
  {
    name: 'confirmacion',
    label: 'Repetir nueva contraseña',
    type: 'password',
    autoComplete: 'new-password',
    maxLength: 128,
  },
];
export const currentPasswordField = {
  name: 'passwordActual',
  label: 'Contraseña actual',
  type: 'password',
  autoComplete: 'current-password',
  maxLength: 128,
};
export const emailField = {
  name: 'email',
  label: 'Correo electrónico',
  type: 'email',
  autoComplete: 'email',
  maxLength: 254,
};

export default function AccountForm({ mode, initial = {}, fields, label, disabled, onSubmit }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const id = useId();
  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const validation = validateAccount(values, mode);
        setErrors(validation);
        const first = Object.keys(validation)[0];
        if (first) {
          event.currentTarget.elements.namedItem(first)?.focus();
          return;
        }
        if (await onSubmit(values))
          setValues((previous) =>
            Object.fromEntries(
              Object.entries(previous).map(([key, value]) => [
                key,
                key.startsWith('password') || key === 'confirmacion' ? '' : value,
              ]),
            ),
          );
      }}
    >
      <fieldset disabled={disabled} className="border-0 p-0 m-0">
        {fields.map(({ label: text, name, ...input }) => (
          <label className="d-block mb-3" key={name}>
            {text}
            <input
              {...input}
              className="form-control"
              name={name}
              value={values[name] || ''}
              aria-invalid={!!errors[name]}
              aria-describedby={errors[name] ? `${id}-${name}` : undefined}
              onChange={(event) => {
                setValues((previous) => ({ ...previous, [name]: event.target.value }));
                setErrors((previous) => ({ ...previous, [name]: undefined }));
              }}
            />
            {errors[name] && (
              <small id={`${id}-${name}`} className="auth-field-error" role="alert">
                {errors[name]}
              </small>
            )}
          </label>
        ))}
        {(mode === 'password' || mode === 'reset') && (
          <p className="muted">
            Usá entre 12 y 128 caracteres. Al guardar se cerrarán las sesiones de esta cuenta.
          </p>
        )}
        <button type="submit" className="btn btn-accent">
          {label}
        </button>
      </fieldset>
    </form>
  );
}
