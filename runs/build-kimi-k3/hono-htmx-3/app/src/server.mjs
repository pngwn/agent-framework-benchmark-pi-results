import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { getIndex } from './api.js';
import { homePage } from './pages/home.js';
import { pokemonPage } from './pages/pokemon.js';
import { abilityPage, movePage, typePage, typesPage } from './pages/details.js';
import { layout, notFoundContent, titleFor } from './views.js';

const app = new Hono();

for (const path of ['/styles.css', '/tokens.css', '/app.js', '/favicon.ico', '/vendor/*']) {
  app.use(path, serveStatic({ root: './public' }));
}

const notFound = (c) => {
  c.status(404);
  return c.html(layout(titleFor('Not found'), notFoundContent));
};

app.get('/', homePage);
app.get('/pokemon/:name', async (c) => (await pokemonPage(c, c.req.param('name'))) ?? notFound(c));
app.get('/moves/:name', async (c) => (await movePage(c, c.req.param('name'))) ?? notFound(c));
app.get('/abilities/:name', async (c) => (await abilityPage(c, c.req.param('name'))) ?? notFound(c));
app.get('/types', typesPage);
app.get('/types/:name', async (c) => (await typePage(c, c.req.param('name'))) ?? notFound(c));
app.notFound(notFound);

app.onError((err, c) => {
  console.error(err);
  c.status(500);
  return c.html(layout(titleFor('Not found'), notFoundContent));
});

// Warm the in-memory index right away so the first request is fast.
getIndex().catch((err) => console.error('Failed to warm index:', err));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex app listening on http://localhost:${info.port}`);
});
