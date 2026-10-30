import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST_ROOT = path.join(APP_ROOT, 'dist', 'app', 'browser');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

if (!fs.existsSync(path.join(DIST_ROOT, 'index.html'))) {
  console.error(`No production build found at ${DIST_ROOT}. Run npm run build first.`);
  process.exit(1);
}

const baseIndex = fs.readFileSync(path.join(DIST_ROOT, 'index.html'), 'utf8');
const configScript = `<script>window.__POKEDEX_API_BASE_URL__=${JSON.stringify(API_BASE_URL)};</script>`;
const indexHtml = baseIndex.includes('</head>')
  ? baseIndex.replace('</head>', `${configScript}</head>`)
  : `${configScript}${baseIndex}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, file) {
  const extension = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[extension] ?? 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
  } catch {
    pathname = '/';
  }

  const requested = path.resolve(DIST_ROOT, `.${pathname}`);
  if (
    requested.startsWith(DIST_ROOT + path.sep) &&
    fs.existsSync(requested) &&
    fs.statSync(requested).isFile()
  ) {
    if (req.method === 'HEAD') {
      res.writeHead(200);
      return res.end();
    }
    return sendFile(res, requested);
  }

  if (path.extname(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not Found');
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(req.method === 'HEAD' ? undefined : indexHtml);
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT} (API ${API_BASE_URL})`);
});
