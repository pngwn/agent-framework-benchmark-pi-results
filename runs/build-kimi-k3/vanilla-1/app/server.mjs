#!/usr/bin/env node
// Production server: server-renders every page from live API data and serves
// the Vite-built client bundle from dist/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { layout } from './src/layout.js';
import { homePage } from './src/pages/home.js';
import { pokemonPage } from './src/pages/pokemon.js';
import { movePage } from './src/pages/move.js';
import { abilityPage } from './src/pages/ability.js';
import { typeListPage, typePage } from './src/pages/types.js';
import { notFoundPage } from './src/pages/notfound.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 3000);

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function findBuiltAssets() {
  const dir = path.join(DIST, 'assets');
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    throw new Error('No production build found. Run `npm run build` first.');
  }
  const js = files.find((f) => f.endsWith('.js'));
  const css = files.find((f) => f.endsWith('.css'));
  return { js: js ?? '', css: css ?? '' };
}

const assets = findBuiltAssets();

async function route(pathname, searchParams) {
  if (pathname === '/') return homePage(searchParams);
  if (pathname === '/types') return typeListPage();
  let m;
  if ((m = pathname.match(/^\/pokemon\/([^/]+)\/?$/))) return pokemonPage(decodeURIComponent(m[1]).toLowerCase(), searchParams);
  if ((m = pathname.match(/^\/moves\/([^/]+)\/?$/))) return movePage(decodeURIComponent(m[1]).toLowerCase());
  if ((m = pathname.match(/^\/abilities\/([^/]+)\/?$/))) return abilityPage(decodeURIComponent(m[1]).toLowerCase());
  if ((m = pathname.match(/^\/types\/([^/]+)\/?$/))) return typePage(decodeURIComponent(m[1]).toLowerCase());
  return notFoundPage();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname.startsWith('/assets/')) {
    const file = path.resolve(DIST, decodeURIComponent(url.pathname).replace(/^\//, ''));
    if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    return fs.createReadStream(file).pipe(res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  try {
    const page = (await route(url.pathname.replace(/\/+$/, '') || '/', url.searchParams)) ?? notFoundPage();
    const html = layout({ title: page.title, h1: page.h1, body: page.body, assets });
    res.writeHead(page.status ?? 200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT}`);
});
