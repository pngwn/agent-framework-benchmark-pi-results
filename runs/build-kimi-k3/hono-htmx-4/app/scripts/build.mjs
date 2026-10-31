// Production build: copy the htmx client into public/ so it can be served statically.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules/htmx.org/dist/htmx.min.js');
const destDir = path.join(root, 'public');
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, path.join(destDir, 'htmx.min.js'));
console.log('Built: copied htmx.min.js to public/');
