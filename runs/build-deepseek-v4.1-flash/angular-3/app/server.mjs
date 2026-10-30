import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const candidates = [
  'dist/client/browser',
  'dist/client',
  'dist/browser',
  'dist',
].map((candidate) => path.join(ROOT, candidate));

const publicDir = candidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'index.html')),
);

if (!publicDir) {
  console.error('No production build found. Run `npm run build` first.');
  process.exit(1);
}

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const rawIndex = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const apiBaseLiteral = JSON.stringify(API_BASE_URL).slice(1, -1);
const indexHtml = rawIndex.replaceAll('__POKEDEX_API_BASE_URL__', apiBaseLiteral);

function sendFile(res, file, method) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': file.includes(`${path.sep}media${path.sep}`)
      ? 'public, max-age=3600'
      : ext === '.html'
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
  };
  res.writeHead(200, headers);
  if (method === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(file).pipe(res);
  }
  return true;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  if (pathname === '/' || pathname === '/index.html') {
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    return res.end(indexHtml);
  }

  const relative = pathname.replace(/^\/+/, '');
  const file = path.resolve(publicDir, relative);
  if (file.startsWith(publicDir + path.sep) && sendFile(res, file, req.method)) return;

  if (!path.extname(pathname)) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    return res.end(indexHtml);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Pokédex listening on http://localhost:${PORT} (API ${API_BASE_URL})`);
});
