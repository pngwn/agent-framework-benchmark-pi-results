import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { notFoundPage } from './render.js';
import { homePage } from './pages/home.js';
import { pokemonPage, movesTablePartial } from './pages/pokemon.js';
import { movePage, abilityPage, typeListPage, typePage } from './pages/details.js';

const app = new Hono();

app.use('/app.css', serveStatic({ root: './public' }));
app.use('/tokens.css', serveStatic({ root: './public' }));
app.use('/htmx.min.js', serveStatic({ root: './public' }));

const notFound = (c) => c.html(notFoundPage(), 404);

app.get('/', homePage);

app.get('/pokemon/:name/moves-table', async (c) => (await movesTablePartial(c)) ?? notFound(c));
app.get('/pokemon/:name', async (c) => (await pokemonPage(c)) ?? notFound(c));
app.get('/moves/:name', async (c) => (await movePage(c)) ?? notFound(c));
app.get('/abilities/:name', async (c) => (await abilityPage(c)) ?? notFound(c));
app.get('/types', async (c) => (await typeListPage(c)) ?? notFound(c));
app.get('/types/:name', async (c) => (await typePage(c)) ?? notFound(c));

app.notFound(notFound);

app.onError((err, c) => {
  console.error(err);
  return c.html('<h1>Something went wrong</h1>', 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex app listening on http://localhost:${info.port}`);
});
