#!/usr/bin/env node
// Serves the production build in dist/ on $PORT (default 3000).
// Any path that isn't a build asset gets index.html (client-side routing).
// /config.js tells the browser where the API lives ($API_BASE_URL).

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const configScript = `window.__API_BASE_URL__ = ${JSON.stringify(API_BASE_URL)};\n`;

async function sendFile(res, file) {
  const stat = await fsp.stat(file);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/config.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(configScript);
      return;
    }

    const file = path.resolve(DIST, `.${pathname}`);
    if (file.startsWith(DIST + path.sep)) {
      try {
        const stat = await fsp.stat(file);
        if (stat.isFile()) {
          await sendFile(res, file);
          return;
        }
      } catch {}
    }

    // SPA fallback: every page is rendered by the client.
    await sendFile(res, path.join(DIST, 'index.html'));
  } catch (err) {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT} (API at ${API_BASE_URL})`);
});
