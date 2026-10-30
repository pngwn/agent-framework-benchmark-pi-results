import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 3000);

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
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function sendFile(res, file, status = 200) {
  const stat = await fsp.stat(file);
  if (!stat.isFile()) throw Object.assign(new Error('Not a file'), { code: 'ENOENT' });
  res.writeHead(status, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end('Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  const rel = pathname.replace(/^\/+/, '');
  const candidate = path.resolve(DIST, rel);
  if (candidate === DIST || candidate.startsWith(DIST + path.sep)) {
    try {
      await sendFile(res, candidate);
      return;
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'EISDIR') {
        res.writeHead(500);
        return res.end('Internal Server Error');
      }
    }
  }

  // Client-side routed pages all fall back to the SPA entry point.
  try {
    await sendFile(res, path.join(DIST, 'index.html'), 200);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT}`);
});
