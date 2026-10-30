import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

fs.cpSync(publicDir, distDir, { recursive: true });

// htmx is vendored into the production build so start does not depend on a dev server.
const htmxSource = path.join(root, 'node_modules/htmx.org/dist/htmx.min.js');
const htmxTarget = path.join(distDir, 'vendor/htmx.min.js');
fs.mkdirSync(path.dirname(htmxTarget), { recursive: true });
fs.copyFileSync(htmxSource, htmxTarget);

console.log('Built app into dist/');
