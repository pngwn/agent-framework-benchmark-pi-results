// This app is server-rendered at runtime and needs no bundling. The build step
// validates that htmx is installed so `npm start` can serve it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmx = path.join(root, 'node_modules/htmx.org/dist/htmx.min.js');
if (!fs.existsSync(htmx)) {
  console.error('htmx.org is not installed. Run npm install first.');
  process.exit(1);
}
console.log('Production build ready (server-rendered Hono app).');
