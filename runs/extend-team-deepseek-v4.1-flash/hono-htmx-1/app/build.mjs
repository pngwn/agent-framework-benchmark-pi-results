// Bundles the server into dist/ and copies the static assets next to it.
import { build } from 'esbuild';
import fs from 'node:fs';

fs.rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/index.tsx'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx',
});
fs.cpSync('public', 'dist/static', { recursive: true });
fs.copyFileSync('node_modules/htmx.org/dist/htmx.min.js', 'dist/static/htmx.min.js');
console.log('Built dist/');
