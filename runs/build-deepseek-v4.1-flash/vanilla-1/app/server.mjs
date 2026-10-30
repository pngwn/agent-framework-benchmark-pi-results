import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store' });
  res.end(body);
}

function renderIndex() {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const config = `<script>window.__API_BASE_URL__=${JSON.stringify(API_BASE_URL).replace(/</g, '\\u003c')};</script>`;
  return html.replace('</head>', `${config}</head>`);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }

  if (pathname === '/' || !path.extname(pathname)) {
    try {
      return send(res, 200, renderIndex(), MIME['.html']);
    } catch {
      return send(res, 500, 'Build not found. Run npm run build first.');
    }
  }

  const file = path.resolve(DIST, `.${pathname}`);
  if (!file.startsWith(DIST + path.sep)) return send(res, 404, 'Not Found');
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return send(res, 404, 'Not Found');
    const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'public, max-age=31536000, immutable' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch {
    send(res, 404, 'Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT} (API ${API_BASE_URL})`);
});
