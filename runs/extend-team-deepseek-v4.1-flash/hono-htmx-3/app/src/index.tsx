import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { englishName, mainTypes } from './data';
import { NotFound, TeamButton } from './views/components';
import { AbilityPage, MovePage, TypePage, TypesPage, loadAbility, loadMove, loadType } from './views/details';
import { HomePage, Results, homeUrl, loadHome, parseHomeQuery } from './views/home';
import { renderer } from './views/layout';
import { MoveTable, MoveTables, PokemonPage, loadMoves, loadPokemon, type SortDir, type SortKey } from './views/pokemon';
import { TEAM_MAX, loadTeam, readTeam, writeTeam } from './team';
import { TeamContent, TeamPage } from './views/team';

const app = new Hono();

app.use('/static/*', serveStatic({ root: './dist' }));
app.use(renderer);

// htmx partial requests get fragments; history restores (and normal loads) get full pages.
const isPartial = (c: Context) => c.req.header('HX-Request') === 'true' && c.req.header('HX-History-Restore-Request') !== 'true';

const notFound = (c: Context) => {
  c.status(404);
  return c.render(<NotFound />, { title: 'Not found' });
};

app.get('/', async (c) => {
  c.header('Vary', 'HX-Request, HX-History-Restore-Request');
  const data = await loadHome(parseHomeQuery(c.req.query()));
  if (isPartial(c)) {
    c.header('HX-Push-Url', homeUrl(data.query));
    return c.html(<Results data={data} />);
  }
  return c.render(<HomePage data={data} />, { title: '' });
});

app.get('/pokemon/:name', async (c) => {
  const data = await loadPokemon(c.req.param('name'));
  if (!data) return notFound(c);
  const moves = await loadMoves(data.pokemon, c.req.query('game'));
  const team = readTeam(c);
  return c.render(
    <PokemonPage
      data={data}
      moves={moves}
      team={{ member: team.includes(data.species.name), full: team.length >= TEAM_MAX }}
    />,
    { title: englishName(data.species) },
  );
});

// Add or remove this species from the browser's team, returning just the button.
app.post('/pokemon/:name/team', async (c) => {
  const name = c.req.param('name').toLowerCase();
  const team = readTeam(c);
  const member = team.includes(name);
  let next = team;
  if (member) next = team.filter((n) => n !== name);
  else if (team.length < TEAM_MAX) next = [...team, name];
  writeTeam(c, next);
  if (!isPartial(c)) return c.redirect(`/pokemon/${encodeURIComponent(name)}`, 303);
  return c.html(<TeamButton species={name} member={next.includes(name)} full={next.length >= TEAM_MAX} />);
});

app.get('/pokemon/:name/moves', async (c) => {
  const data = await loadPokemon(c.req.param('name'));
  if (!data) return notFound(c);
  const moves = await loadMoves(data.pokemon, c.req.query('game'));
  const params = moves.selected ? `?${new URLSearchParams({ game: moves.selected })}` : '';
  c.header('HX-Push-Url', `/pokemon/${data.species.name}${params}`);
  return c.html(<MoveTables species={data.species.name} data={moves} />);
});

const SORT_KEYS = new Set(['level', 'move', 'type', 'category', 'power', 'accuracy', 'pp']);

app.get('/pokemon/:name/moves-table', async (c) => {
  const data = await loadPokemon(c.req.param('name'));
  if (!data) return notFound(c);
  const { game, method, sort, dir } = c.req.query();
  const moves = await loadMoves(data.pokemon, game);
  const table = moves.tables.find((t) => t.method === method);
  if (!table) return notFound(c);
  return c.html(
    <MoveTable
      species={data.species.name}
      game={moves.selected ?? ''}
      method={table.method}
      rows={table.rows}
      sort={SORT_KEYS.has(sort ?? '') ? (sort as SortKey) : undefined}
      dir={dir === 'descending' ? 'descending' : ('ascending' as SortDir)}
    />,
  );
});

app.get('/moves/:name', async (c) => {
  const data = await loadMove(c.req.param('name'));
  if (!data) return notFound(c);
  return c.render(<MovePage data={data} />, { title: englishName(data.move) });
});

app.get('/abilities/:name', async (c) => {
  const data = await loadAbility(c.req.param('name'));
  if (!data) return notFound(c);
  return c.render(<AbilityPage data={data} />, { title: englishName(data.ability) });
});

app.get('/types', async (c) => c.render(<TypesPage types={await mainTypes()} />, { title: 'Types' }));

app.get('/team', async (c) => {
  const data = await loadTeam(readTeam(c));
  return c.render(<TeamPage data={data} />, { title: 'Team' });
});

app.post('/team/remove', async (c) => {
  const body = await c.req.parseBody();
  const name = typeof body.name === 'string' ? body.name : '';
  const team = readTeam(c).filter((n) => n !== name);
  writeTeam(c, team);
  if (!isPartial(c)) return c.redirect('/team', 303);
  return c.html(<TeamContent data={await loadTeam(team)} />);
});

app.get('/types/:name', async (c) => {
  const data = await loadType(c.req.param('name'));
  if (!data) return notFound(c);
  return c.render(<TypePage data={data} />, { title: englishName(data.type) });
});

app.notFound(notFound);

app.onError((err, c) => {
  console.error(err);
  c.status(500);
  return c.render(
    <>
      <h1>Something went wrong</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </>,
    { title: 'Something went wrong' },
  );
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => console.log(`Pokédex listening on http://localhost:${info.port}`));
