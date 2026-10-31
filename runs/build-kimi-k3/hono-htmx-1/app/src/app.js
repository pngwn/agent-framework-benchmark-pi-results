import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { homePage } from './pages/home.js';
import { pokemonPage, moveTablePartial } from './pages/pokemon.js';
import { movePage } from './pages/move.js';
import { abilityPage } from './pages/ability.js';
import { typeListPage, typePage } from './pages/types.js';
import { notFoundPage } from './pages/notfound.js';

export const app = new Hono();

app.use('/static/*', serveStatic({ root: './' }));

app.get('/', homePage);
app.get('/pokemon/:name/move-table', async (c) => (await moveTablePartial(c)) ?? notFoundPage(c));
app.get('/pokemon/:name', async (c) => (await pokemonPage(c)) ?? notFoundPage(c));
app.get('/moves/:name', async (c) => (await movePage(c)) ?? notFoundPage(c));
app.get('/abilities/:name', async (c) => (await abilityPage(c)) ?? notFoundPage(c));
app.get('/types', typeListPage);
app.get('/types/:name', async (c) => (await typePage(c)) ?? notFoundPage(c));

app.notFound(notFoundPage);
