import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 3000);
const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('No production build found. Run `npm run build` first.');
  process.exit(1);
}

const indexTemplate = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const configScript = `<script>window.__API_BASE_URL__ = ${JSON.stringify(API_BASE_URL).replaceAll('<', '\\u003c')};</script>`;
const indexHtml = indexTemplate.includes('</head>')
  ? indexTemplate.replace('</head>', `${configScript}</head>`)
  : `${configScript}${indexTemplate}`;

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad Request');
    return;
  }

  const file = path.resolve(DIST, `.${pathname}`);
  if (!file.startsWith(DIST + path.sep) && file !== DIST) {
    send(res, 404, 'Not Found');
    return;
  }

  let stats;
  try {
    stats = fs.statSync(file);
  } catch {
    stats = null;
  }

  if (stats?.isFile()) {
    const type = MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
    return;
  }

  // Client-side routes all render index.html; the client reads its runtime API URL.
  if (req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end();
    return;
  }
  send(res, 200, indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pokédex app listening on http://localhost:${PORT} (API: ${API_BASE_URL})`);
});
