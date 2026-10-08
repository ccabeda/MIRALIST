import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['node_modules', 'dist', '.git']);
const extensions = new Set(['.js', '.jsx', '.css', '.html', '.json', '.md', '.svg']);
const limit = 400;
const failures = [];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(path);
    } else if (
      entry.isFile() &&
      entry.name !== 'package-lock.json' &&
      extensions.has(extname(entry.name))
    ) {
      const content = await readFile(path, 'utf8');
      const lines = content ? content.replace(/\r?\n$/, '').split(/\r?\n/).length : 0;
      if (lines > limit) failures.push(`${relative(root, path)}: ${lines} líneas`);
    }
  }
}

await inspect(root);
if (failures.length) {
  console.error(`Archivos que superan ${limit} líneas:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Todos los archivos propios tienen como máximo ${limit} líneas.`);
}
