import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const executable = join(
  root,
  '.tools',
  'dotnet',
  process.platform === 'win32' ? 'dotnet.exe' : 'dotnet',
);
const commands = {
  run: ['run', '--project', 'backend/API'],
  build: ['build', 'Miralist.slnx'],
  test: ['test', 'Miralist.slnx'],
  init: ['run', '--project', 'backend/API', '--', '--init-db'],
};
const args = commands[process.argv[2] || 'run'];
if (!args) throw new Error('Comando de backend desconocido.');
const child = spawn(existsSync(executable) ? executable : 'dotnet', args, {
  cwd: root,
  stdio: 'inherit',
});
child.on('error', () => {
  console.error('No se pudo iniciar .NET. Instalá el SDK .NET 10.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
