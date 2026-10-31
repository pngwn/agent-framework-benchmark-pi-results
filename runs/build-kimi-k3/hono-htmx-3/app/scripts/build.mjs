// Production build: vendor the client-side assets the server serves from public/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = path.join(root, 'public', 'vendor');
fs.mkdirSync(vendorDir, { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules', 'htmx.org', 'dist', 'htmx.min.js'),
  path.join(vendorDir, 'htmx.min.js'),
);
console.log('Build complete.');
