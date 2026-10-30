import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist', 'app', 'browser');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const configScript = `window.__API_BASE_URL__ = ${JSON.stringify(API_BASE_URL)};\n`;

function sendFile(res, file, cache = true) {
  const ext = path.extname(file).toLowerCase();
  const stream = fs.createReadStream(file);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': cache ? 'public, max-age=3600' : 'no-store',
  });
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }

  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/config.js') {
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    return res.end(req.method === 'HEAD' ? undefined : configScript);
  }

  const decoded = decodeURIComponent(url.pathname);
  const relative = decoded.replace(/^\/+/, '');
  const candidate = path.resolve(DIST, relative);
  if (candidate.startsWith(DIST + '\\') || candidate === DIST || candidate.startsWith(DIST + '/')) {
    if (candidate.startsWith(DIST) && candidate !== DIST) {
      try {
        if (fs.statSync(candidate).isFile()) return sendFile(res, candidate);
      } catch {}
    }
  }

  const index = path.join(DIST, 'index.html');
  if (!fs.existsSync(index)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Build output not found. Run npm run build first.');
  }
  sendFile(res, index, false);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pokédex app listening on http://localhost:${PORT} (API: ${API_BASE_URL})`);
});
