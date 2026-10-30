import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { englishName, getAbility, getMove, getSpeciesCatalog, getTypeCatalog } from './src/api.mjs';
import { homeUrl } from './src/render.mjs';
import {
  getHomeData,
  getPokemonPageData,
  renderAbilityPage,
  renderHomePage,
  renderMovePage,
  renderMoveTable,
  renderMovesSection,
  renderNotFound,
  renderPokemonPage,
  renderTypePage,
  renderTypesPage,
  wrapPage,
} from './src/views.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const require = createRequire(import.meta.url);

function readPublicFile(name, fallback) {
  const candidates = [path.join(publicDir, name)];
  if (fallback) candidates.push(fallback());
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
  }
  throw new Error(`Missing static file: ${name}`);
}

const stylesCss = readPublicFile('styles.css');
const tokensCss = readPublicFile('tokens.css');
const htmxJs = readPublicFile('htmx.min.js', () => require.resolve('htmx.org/dist/htmx.min.js'));

const app = new Hono();

app.get('/styles.css', (c) => c.body(stylesCss, 200, { 'Content-Type': 'text/css; charset=utf-8' }));
app.get('/tokens.css', (c) => c.body(tokensCss, 200, { 'Content-Type': 'text/css; charset=utf-8' }));
app.get('/htmx.min.js', (c) =>
  c.body(htmxJs, 200, { 'Content-Type': 'text/javascript; charset=utf-8' }),
);

app.get('/', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const type = (c.req.query('type') ?? '').trim();
  const generation = (c.req.query('generation') ?? '').trim();
  const requestedPage = Number.parseInt(c.req.query('page') ?? '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const data = await getHomeData({ q, type, generation, page });
  const partial =
    c.req.header('HX-Request') === 'true' && c.req.header('HX-Target') === 'pokemon-results';
  const html = renderHomePage(data, { partial });

  if (partial) {
    c.header('HX-Push-Url', homeUrl({ q, type, generation, page: data.page }));
    return c.html(html);
  }
  return c.html(wrapPage('Pokémon', html));
});

app.get('/types', async (c) => {
  const typeCatalog = await getTypeCatalog();
  return c.html(wrapPage('Types', renderTypesPage(typeCatalog)));
});

app.get('/types/:name', async (c) => {
  const name = c.req.param('name');
  const [typeCatalog, speciesCatalog] = await Promise.all([getTypeCatalog(), getSpeciesCatalog()]);
  const type = typeCatalog.byName.get(name);
  if (!type) return c.html(renderNotFound(), 404);
  return c.html(wrapPage(type.display, renderTypePage(type, speciesCatalog, typeCatalog)));
});

app.get('/moves/:name', async (c) => {
  const name = c.req.param('name');
  const [move, speciesCatalog] = await Promise.all([getMove(name), getSpeciesCatalog()]);
  if (!move) return c.html(renderNotFound(), 404);
  return c.html(wrapPage(englishName(move, move.name), renderMovePage(move, speciesCatalog)));
});

app.get('/abilities/:name', async (c) => {
  const name = c.req.param('name');
  const [ability, speciesCatalog] = await Promise.all([getAbility(name), getSpeciesCatalog()]);
  if (!ability) return c.html(renderNotFound(), 404);
  return c.html(wrapPage(englishName(ability, ability.name), renderAbilityPage(ability, speciesCatalog)));
});

app.get('/pokemon/:name/move-table', async (c) => {
  const name = c.req.param('name');
  const game = c.req.query('game') ?? '';
  const methodName = c.req.query('method') ?? '';
  const sortKey = c.req.query('sort') ?? '';
  const direction = c.req.query('dir') === 'descending' ? 'descending' : 'ascending';

  const data = await getPokemonPageData(name, game);
  if (!data?.movesData.selected) return c.html(renderNotFound(), 404);
  const method = data.movesData.methods.find((entry) => entry.name === methodName);
  if (!method) return c.html(renderNotFound(), 404);

  return c.html(
    renderMoveTable({
      speciesName: data.species.name,
      gameName: data.movesData.selected.name,
      method,
      sortKey,
      direction,
    }),
  );
});

app.get('/pokemon/:name', async (c) => {
  const name = c.req.param('name');
  const game = c.req.query('game') ?? '';
  const data = await getPokemonPageData(name, game);
  if (!data) return c.html(renderNotFound(), 404);

  if (c.req.header('HX-Request') === 'true' && c.req.header('HX-Target') === 'moves') {
    const selectedGame = data.movesData.selected?.name;
    const canonical = selectedGame
      ? `/pokemon/${encodeURIComponent(data.species.name)}?game=${encodeURIComponent(selectedGame)}`
      : `/pokemon/${encodeURIComponent(data.species.name)}`;
    c.header('HX-Push-Url', canonical);
    return c.html(renderMovesSection(data.species.name, data.movesData));
  }

  return c.html(wrapPage(englishName(data.species, data.species.name), renderPokemonPage(data)));
});

app.notFound((c) => c.html(renderNotFound(), 404));

app.onError((error, c) => {
  console.error(error);
  return c.html(renderNotFound(), 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Pokédex listening on http://localhost:${info.port}`);
});
