import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeAdapter, getClientBuildPath } from '@gracile/gracile/node';
import { handler } from './dist/server/entrypoint.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const clientDir = getClientBuildPath(import.meta.url);
const port = Number(process.env.PORT ?? 3000);
const adapt = nodeAdapter(handler);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'], ['.svg', 'image/svg+xml'], ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2'], ['.map', 'application/json'],
]);

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let rel = pathname.replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel = path.join(rel, 'index.html');
  const file = path.resolve(clientDir, rel);
  if (!file.startsWith(path.resolve(clientDir) + path.sep)) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;
  res.writeHead(200, {
    'Content-Type': types.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  if (serveStatic(req, res)) return;
  try {
    await adapt(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});
server.listen(port, () => console.log(`Pokédex listening on http://localhost:${port}`));
