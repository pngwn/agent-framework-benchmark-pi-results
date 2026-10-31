// Production server: serves the Vite-built static assets and server-renders
// every page, fetching all data from the PokeAPI server at request time.
//
// Env: PORT (default 3000), API_BASE_URL (default http://localhost:9000).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from './src/server/pages.js';
import { warm } from './src/server/api.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 3000);

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

// Pre-warm the API cache in the background; pages await what they need.
warm().catch((err) => console.error('Warm-up failed:', err));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (url.pathname.startsWith('/assets/')) {
      const file = path.resolve(DIST, `.${url.pathname}`);
      if (file.startsWith(DIST + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        fs.createReadStream(file).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const { status, html } = await renderPage(url);
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT}`);
});
