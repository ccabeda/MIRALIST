import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAuth } from '../domain/auth-validation.js';

test('auth: valida campos vacíos, correo y contraseña sin avisos nativos', () => {
  assert.deepEqual(Object.keys(validateAuth({ nombre: '  ', email: '', password: '' }, true)), [
    'nombre',
    'email',
    'password',
  ]);
  assert.deepEqual(Object.keys(validateAuth({ nombre: '', email: '', password: '' }, false)), [
    'email',
    'password',
  ]);
  assert.ok(validateAuth({ nombre: 'Test', email: 'incorrecto', password: 'corta' }, true).email);
  assert.ok(
    validateAuth({ nombre: 'Test', email: 'test@example.com', password: 'corta' }, true).password,
  );
  assert.deepEqual(
    validateAuth({ nombre: 'Test', email: 'test@example.com', password: 'contraseña-larga' }, true),
    {},
  );
  assert.deepEqual(
    validateAuth({ nombre: '', email: 'test@example.com', password: 'corta' }, false),
    {},
  );
});
