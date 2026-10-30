import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(appDir, 'public');
const require = createRequire(import.meta.url);

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(require.resolve('htmx.org/dist/htmx.min.js'), path.join(publicDir, 'htmx.min.js'));

for (const file of ['tokens.css', 'styles.css']) {
  if (!fs.existsSync(path.join(publicDir, file))) {
    throw new Error(`Missing public/${file}`);
  }
}

console.log('Built Pokédex static assets.');
