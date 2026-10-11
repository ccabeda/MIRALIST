import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAccount, recoveryToken } from '../domain/account-validation.js';

test('perfil requiere nombre, correo válido y contraseña actual', () => {
  assert.deepEqual(Object.keys(validateAccount({}, 'profile')), [
    'nombre',
    'email',
    'passwordActual',
  ]);
  assert.ok(
    validateAccount({ nombre: 'Prueba', email: 'incorrecto', passwordActual: 'actual' }, 'profile')
      .email,
  );
  assert.deepEqual(
    validateAccount(
      { nombre: 'Prueba', email: 'test@example.test', passwordActual: 'actual' },
      'profile',
    ),
    {},
  );
});
test('cambiar contraseña exige una diferente, longitud correcta y confirmación', () => {
  const values = {
    passwordActual: 'Anterior-123!',
    passwordNueva: 'Nueva-clave-456!',
    confirmacion: 'Nueva-clave-456!',
  };
  assert.deepEqual(validateAccount(values, 'password'), {});
  assert.ok(validateAccount({ ...values, confirmacion: 'Otra' }, 'password').confirmacion);
  assert.ok(
    validateAccount({ ...values, passwordNueva: values.passwordActual }, 'password').passwordNueva,
  );
  assert.ok(validateAccount({ ...values, passwordNueva: 'corta' }, 'reset').passwordNueva);
});
test('recuperación solo acepta enlaces con un token completo', () => {
  assert.equal(recoveryToken('#reset-password=' + 'A'.repeat(64)), 'A'.repeat(64));
  assert.equal(recoveryToken('#reset-password=abc'), '');
  assert.equal(
    recoveryToken('#reset-password=' + 'A'.repeat(64) + '&next=https://example.test'),
    '',
  );
  assert.equal(recoveryToken('#inicio'), '');
});
