import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import {
  apiFetch,
  englishName,
  englishShortEffect,
  getIndex,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
  mapLimit,
  toSpeciesList,
} from './api.js';
import {
  abilityPage,
  homePage,
  homeResults,
  movePage,
  movesInner,
  movesTable,
  notFoundPage,
  pokemonPage,
  typePage,
  typesPage,
  PAGE_SIZE,
} from './views.js';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const SORT_KEYS = {
  level: (r) => r.level,
  move: (r) => r.en,
  type: (r) => r.typeEn,
  category: (r) => r.category,
  power: (r) => r.power,
  accuracy: (r) => r.accuracy,
  pp: (r) => r.pp,
};

export const app = new Hono();

// Static assets (path resolved relative to the app directory).
app.use('/styles.css', serveStatic({ path: './public/styles.css' }));
app.use('/htmx.min.js', serveStatic({ path: './public/htmx.min.js' }));
app.use('/app.js', serveStatic({ path: './public/app.js' }));

const notFound = (c) => c.html(notFoundPage(), 404);

// ---- Home: Pokémon list ------------------------------------------------------

app.get('/', async (c) => {
  const index = await getIndex();
  const q = (c.req.query('q') ?? '').trim();
  const type = c.req.query('type') ?? '';
  const generation = c.req.query('generation') ?? '';

  const needle = q.toLowerCase();
  const matched = index.species.filter(
    (s) =>
      (!needle || humanize(s.name).toLowerCase().includes(needle)) &&
      (!type || s.types.some((t) => t.name === type)) &&
      (!generation || s.generation === generation),
  );

  const count = matched.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  let page = Number.parseInt(c.req.query('page') ?? '1', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  const items = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const view = { q, type, generation, page, totalPages, count, items, index };
  if (c.req.header('HX-Request')) return c.html(homeResults(view));
  return c.html(homePage(view));
});

// ---- Pokémon page ------------------------------------------------------------

// Builds the Moves section data: ordered games and per-method tables.
async function buildMovesData(speciesName, pokemon, gameQuery, index) {
  const gameNames = [
    ...new Set(
      pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)),
    ),
  ];
  const vgRecords = await mapLimit(gameNames, 16, (n) => apiFetch(`version-group/${n}`));
  const games = vgRecords
    .filter(Boolean)
    .map((v) => ({ name: v.name, order: v.order }))
    .sort((a, b) => a.order - b.order);
  const selectedGame = games.some((g) => g.name === gameQuery)
    ? gameQuery
    : games[games.length - 1]?.name;

  // Collect (method, level, move) rows for the selected game.
  const byMethod = new Map();
  for (const m of pokemon.moves) {
    const seen = new Set();
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selectedGame) continue;
      const method = d.move_learn_method.name;
      const key = `${method}:${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!byMethod.has(method)) byMethod.set(method, []);
      byMethod.get(method).push({ name: m.move.name, level: d.level_learned_at });
    }
  }

  const moveNames = [...new Set([...byMethod.values()].flat().map((r) => r.name))];
  const moveRecords = await mapLimit(moveNames, 16, (n) => apiFetch(`move/${n}`));
  const moveByName = new Map(moveRecords.filter(Boolean).map((r) => [r.name, r]));
  const typeEn = (n) => index.typeEn.get(n) ?? humanize(n);

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const tables = methods.map((method) => {
    const rows = byMethod.get(method).map(({ name, level }) => {
      const rec = moveByName.get(name);
      return {
        name,
        level,
        en: rec ? englishName(rec) : humanize(name),
        type: rec?.type?.name ?? '',
        typeEn: rec?.type?.name ? typeEn(rec.type.name) : '—',
        category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : '—',
        power: rec?.power ?? null,
        accuracy: rec?.accuracy ?? null,
        pp: rec?.pp ?? null,
      };
    });
    // Default order: Level Up by level then name; other tables by name.
    rows.sort((a, b) => {
      if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
      return a.en.localeCompare(b.en);
    });
    return { speciesName, game: selectedGame, method, rows, sort: null, dir: null };
  });

  return { speciesName, games, selectedGame, tables };
}

function sortedRows(table, sort, dir) {
  const key = SORT_KEYS[sort];
  if (!key || (dir !== 'asc' && dir !== 'desc')) return table.rows;
  const sign = dir === 'desc' ? -1 : 1;
  return [...table.rows].sort((a, b) => {
    const va = key(a);
    const vb = key(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1; // missing values sort last in both directions
    if (vb == null) return -1;
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sign * cmp;
  });
}

async function loadPokemonPageData(name, gameQuery) {
  const species = await apiFetch(`pokemon-species/${name}`);
  if (!species) return null;
  const defaultVariety = (species.varieties ?? []).find((v) => v.is_default) ?? species.varieties?.[0];
  if (!defaultVariety) return null;
  const [pokemon, chain, index] = await Promise.all([
    apiFetch(defaultVariety.pokemon.url),
    species.evolution_chain?.url ? apiFetch(species.evolution_chain.url) : null,
    getIndex(),
  ]);
  if (!pokemon) return null;
  const movesData = await buildMovesData(species.name, pokemon, gameQuery, index);
  return { species, pokemon, chain: chain?.chain, movesData, index };
}

app.get('/pokemon/:name', async (c) => {
  const name = c.req.param('name');
  const data = await loadPokemonPageData(name, c.req.query('game') ?? '');
  if (!data) return notFound(c);
  if (c.req.header('HX-Request')) return c.html(movesInner(data.movesData));
  return c.html(pokemonPage(data));
});

// Fragment endpoint for sorting a single moves table.
app.get('/pokemon/:name/moves-table', async (c) => {
  const name = c.req.param('name');
  const game = c.req.query('game') ?? '';
  const method = c.req.query('method') ?? '';
  const sort = c.req.query('sort') ?? '';
  const dir = c.req.query('dir') ?? '';
  const data = await loadPokemonPageData(name, game);
  if (!data) return notFound(c);
  const table = data.movesData.tables.find((t) => t.method === method);
  if (!table) return notFound(c);
  return c.html(
    movesTable({ ...table, rows: sortedRows(table, sort, dir), sort, dir: dir === 'desc' ? 'desc' : 'asc' }),
  );
});

// ---- Move page -----------------------------------------------------------------

app.get('/moves/:name', async (c) => {
  const [move, index] = await Promise.all([apiFetch(`move/${c.req.param('name')}`), getIndex()]);
  if (!move) return notFound(c);
  const effect =
    englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries) ?? '—';
  const species = toSpeciesList(move.learned_by_pokemon, index);
  return c.html(movePage({ move, effect, species, index }));
});

// ---- Ability page ----------------------------------------------------------------

app.get('/abilities/:name', async (c) => {
  const [ability, index] = await Promise.all([
    apiFetch(`ability/${c.req.param('name')}`),
    getIndex(),
  ]);
  if (!ability) return notFound(c);
  const effect = englishShortEffect(ability.effect_entries) ?? '—';
  const bySpecies = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    const s = id != null ? index.byId.get(id) : undefined;
    if (!s) continue;
    const existing = bySpecies.get(s.id);
    // If a species appears more than once, a non-hidden entry wins.
    bySpecies.set(s.id, { species: s, hidden: existing ? existing.hidden && entry.is_hidden : entry.is_hidden });
  }
  const entries = [...bySpecies.values()].sort((a, b) => a.species.id - b.species.id);
  return c.html(abilityPage({ ability, effect, entries, index }));
});

// ---- Type pages -------------------------------------------------------------------

app.get('/types', async (c) => {
  const index = await getIndex();
  return c.html(typesPage({ index }));
});

app.get('/types/:name', async (c) => {
  const [type, index] = await Promise.all([apiFetch(`type/${c.req.param('name')}`), getIndex()]);
  if (!type) return notFound(c);
  const species = toSpeciesList(type.pokemon, index);
  const moves = [...(type.moves ?? [])].sort((a, b) =>
    humanize(a.name).localeCompare(humanize(b.name)),
  );
  return c.html(typePage({ type, species, moves, index }));
});

// ---- Not found ----------------------------------------------------------------------

app.notFound(notFound);

app.onError((err, c) => {
  console.error(err);
  return c.html(notFoundPage(), 500);
});
