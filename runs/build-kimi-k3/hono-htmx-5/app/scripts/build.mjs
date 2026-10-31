// Production build: vendor the client-side libraries into public/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'public/vendor'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules/htmx.org/dist/htmx.min.js'),
  path.join(root, 'public/vendor/htmx.min.js'),
);
console.log('Built: vendored htmx into public/vendor/');
