#!/usr/bin/env node
// Production static server for the built Pokédex app. It serves the Vite output and
// falls back to index.html so client-side routes work on a full page load. The API
// origin is injected at runtime so the same build can be used against any API server.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

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

let indexHtml = '';
try {
  indexHtml = await fsp.readFile(path.join(DIST, 'index.html'), 'utf8');
} catch {
  console.error(`No production build found in ${DIST}. Run "npm run build" first.`);
  process.exit(1);
}
const configScript = `<script>window.__API_BASE_URL__=${JSON.stringify(API_BASE_URL).replace(/</g, '\\u003c')};</script>`;
indexHtml = indexHtml.replace('</head>', `${configScript}</head>`);

async function fileFor(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const file = path.resolve(DIST, `.${pathname}`);
  if (file !== DIST && !file.startsWith(DIST + path.sep)) return null;
  try {
    const stat = await fsp.stat(file);
    if (stat.isFile()) return file;
    if (stat.isDirectory()) {
      const index = path.join(file, 'index.html');
      const idxStat = await fsp.stat(index);
      if (idxStat.isFile()) return index;
    }
  } catch {}
  return null;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  let url;
  try {
    url = new URL(req.url ?? '/', 'http://localhost');
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  const file = await fileFor(url.pathname);
  if (file && file !== path.join(DIST, 'index.html')) {
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') res.end();
  else res.end(indexHtml);
});

server.listen(PORT, HOST, () => {
  console.log(`Pokédex app listening on http://${HOST}:${PORT} (API: ${API_BASE_URL})`);
});
