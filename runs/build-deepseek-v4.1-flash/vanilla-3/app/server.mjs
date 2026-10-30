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
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function injectConfig(html) {
  const config = `<script>globalThis.__API_BASE__ = ${JSON.stringify(API_BASE_URL).replace(
    /</g,
    '\\u003c',
  )};</script>`;
  return html.includes('</head>') ? html.replace('</head>', `${config}</head>`) : `${config}${html}`;
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, { Allow: 'GET, HEAD' }, 'Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    send(response, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');
    return;
  }

  let filePath = path.resolve(DIST, `.${pathname}`);
  if (filePath !== DIST && !filePath.startsWith(`${DIST}${path.sep}`)) {
    send(response, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
    return;
  }

  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch {
    stat = null;
  }

  if (!stat?.isFile()) {
    if (path.extname(pathname)) {
      send(response, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
      return;
    }
    filePath = path.join(DIST, 'index.html');
  }

  let body;
  try {
    body = fs.readFileSync(filePath);
  } catch {
    send(response, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const isIndex = path.basename(filePath) === 'index.html';
  if (isIndex) body = Buffer.from(injectConfig(body.toString('utf8')), 'utf8');

  const headers = {
    'Content-Type': MIME[extension] ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
  };

  if (request.method === 'HEAD') {
    response.writeHead(200, headers);
    response.end();
    return;
  }
  send(response, 200, headers, body);
});

server.listen(PORT, () => {
  console.log(`Pokédex listening on http://localhost:${PORT} (API: ${API_BASE_URL})`);
});
