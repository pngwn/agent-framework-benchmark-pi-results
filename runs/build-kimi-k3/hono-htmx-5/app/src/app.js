import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import {
  apiJson,
  idFromUrl,
  mapLimit,
  speciesList,
  speciesNameById,
  allTypes,
  typeEnglishByName,
  allGenerations,
  versionGroupOrder,
  speciesIndex,
} from './api.js';
import {
  humanize,
  englishName,
  englishGenus,
  latestEnglishFlavor,
  collapseWhitespace,
  statLabel,
  MISSING,
} from './format.js';
import { layout, pageTitle } from './views/layout.js';
import { notFoundPage, pokemonCard } from './views/components.js';
import { homePage, resultsFragment, PAGE_SIZE } from './views/home.js';
import { pokemonPage, movesSection } from './views/pokemon.js';
import { movePage, abilityPage, typeListPage, typePage } from './views/details.js';

export const app = new Hono();

// Static assets
for (const path of ['/tokens.css', '/styles.css', '/app.js', '/vendor/htmx.min.js']) {
  app.get(path, serveStatic({ root: './public' }));
}

const isHtmx = (c) => c.req.header('HX-Request') === 'true';

const renderPage = (c, h1, main, status = 200) =>
  c.html(layout({ title: pageTitle(h1), main }), status);

const renderNotFound = (c) => renderPage(c, 'Not found', notFoundPage(), 404);

// ---- Home: Pokémon list ----------------------------------------------------

app.get('/', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const type = c.req.query('type') ?? '';
  const generation = c.req.query('generation') ?? '';

  const [index, types, generations, typeLabels] = await Promise.all([
    speciesIndex(),
    allTypes(),
    allGenerations(),
    typeEnglishByName(),
  ]);

  const matches = index.filter(
    (s) =>
      (!q || humanize(s.name).toLowerCase().includes(q.toLowerCase())) &&
      (!type || s.types.some((t) => t.name === type)) &&
      (!generation || s.generation === generation),
  );

  const count = matches.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  let page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
  if (page > totalPages) page = totalPages;

  const cards = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((s) => pokemonCard({ id: s.id, name: s.name, types: s.types, typeLabels }));

  const results = resultsFragment({ q, type, generation, page, totalPages, count, cards });
  if (isHtmx(c)) return c.html(results);

  return renderPage(
    c,
    'Pokédex',
    homePage({
      q,
      type,
      generation,
      page,
      totalPages,
      count,
      cards,
      types: types.map((t) => ({ name: t.name, label: typeLabels.get(t.name) ?? humanize(t.name) })),
      generations: generations.map((g) => ({
        name: g.name,
        label: g.names?.find((n) => n.language.name === 'en')?.name ?? humanize(g.name),
      })),
    }),
  );
});

// ---- Pokémon detail --------------------------------------------------------

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

async function pokemonMovesData(species, pokemon, requestedGame) {
  const orders = await versionGroupOrder();
  const games = [
    ...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
  ].sort((a, b) => (orders.get(a) ?? 0) - (orders.get(b) ?? 0));
  const selectedGame = games.includes(requestedGame) ? requestedGame : games[games.length - 1];

  // Rows for the selected version group, grouped by learn method.
  const byMethod = new Map();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selectedGame) continue;
      const method = d.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, []);
      byMethod.get(method).push({ move: m.move.name, level: d.level_learned_at });
    }
  }

  // Fetch the move records involved.
  const moveNames = [...new Set([...byMethod.values()].flat().map((r) => r.move))];
  const moveRecords = new Map(
    (await mapLimit(moveNames, 24, async (n) => [n, await apiJson(`/move/${n}/`)])),
  );
  const typeLabels = await typeEnglishByName();

  const methods = [...byMethod.entries()]
    .filter(([, rows]) => rows.length)
    .sort(([a], [b]) => {
      const ia = METHOD_ORDER.indexOf(a);
      const ib = METHOD_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return humanize(a).localeCompare(humanize(b));
    })
    .map(([name, rows]) => {
      const tableRows = rows.map((r) => {
        const rec = moveRecords.get(r.move);
        return {
          move: r.move,
          level: r.level,
          moveName: rec ? englishName(rec) : humanize(r.move),
          type: rec?.type?.name ?? '',
          typeName: rec?.type?.name ? (typeLabels.get(rec.type.name) ?? humanize(rec.type.name)) : '',
          category: rec?.damage_class?.name ? humanize(rec.damage_class.name) : MISSING,
          power: rec?.power ?? null,
          accuracy: rec?.accuracy ?? null,
          pp: rec?.pp ?? null,
        };
      });
      tableRows.sort((a, b) =>
        name === 'level-up'
          ? a.level - b.level || a.moveName.localeCompare(b.moveName)
          : a.moveName.localeCompare(b.moveName),
      );
      return { name, label: humanize(name), rows: tableRows };
    });

  return { speciesName: species.name, games, selectedGame, methods };
}

app.get('/pokemon/:name', async (c) => {
  const name = c.req.param('name');
  const species = await apiJson(`/pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return renderNotFound(c);

  const defaultVariety = species.varieties?.find((v) => v.is_default) ?? species.varieties?.[0];
  const pokemon = defaultVariety
    ? await apiJson(`/pokemon/${idFromUrl(defaultVariety.pokemon.url)}/`)
    : null;
  if (!pokemon) return renderNotFound(c);

  const [chain, typeLabels, movesData] = await Promise.all([
    apiJson(`/evolution-chain/${idFromUrl(species.evolution_chain.url)}/`),
    typeEnglishByName(),
    pokemonMovesData(species, pokemon, c.req.query('game') ?? ''),
  ]);

  if (isHtmx(c)) return c.html(movesSection(movesData));

  const enName = englishName(species);
  return renderPage(
    c,
    enName,
    pokemonPage({
      species,
      pokemon,
      name: enName,
      genus: englishGenus(species),
      types: [...pokemon.types]
        .sort((a, b) => a.slot - b.slot)
        .map((t) => ({ name: t.type.name, label: typeLabels.get(t.type.name) ?? humanize(t.type.name) })),
      artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
      flavor: latestEnglishFlavor(species.flavor_text_entries),
      stats: pokemon.stats.map((s) => ({ label: statLabel(s.stat.name), value: s.base_stat })),
      abilities: [...pokemon.abilities]
        .sort((a, b) => a.slot - b.slot)
        .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
      chain: chain?.chain ?? { species: { name: species.name }, evolves_to: [] },
      ...movesData,
    }),
  );
});

// ---- Move detail -----------------------------------------------------------

// Map a list of pokemon references to species cards (alternate forms excluded).
// Each entry may be a bare {name, url} reference (moves) or wrap it in a
// `pokemon` property (types, abilities).
async function speciesCardsFor(entries, extra = () => ({})) {
  const names = await speciesNameById();
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const ref = entry.pokemon ?? entry;
    const id = idFromUrl(ref.url);
    if (id > 10000 || seen.has(id)) continue; // alternate forms out of scope
    seen.add(id);
    const speciesName = names.get(id);
    if (!speciesName) continue;
    out.push({ id, name: speciesName, extra: extra(entry) });
  }
  out.sort((a, b) => a.id - b.id);
  return out.map(({ id, name, extra: e }) => pokemonCard({ id, name, ...e }));
}

app.get('/moves/:name', async (c) => {
  const move = await apiJson(`/move/${encodeURIComponent(c.req.param('name'))}/`);
  if (!move) return renderNotFound(c);

  const typeLabels = await typeEnglishByName();
  const effect =
    move.effect_entries?.find((e) => e.language.name === 'en')?.short_effect ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    MISSING;

  const cards = await speciesCardsFor(move.learned_by_pokemon ?? []);

  const enName = englishName(move);
  return renderPage(
    c,
    enName,
    movePage({
      move,
      name: enName,
      typeLabel: typeLabels.get(move.type.name) ?? humanize(move.type.name),
      effect: collapseWhitespace(effect),
      cards,
    }),
  );
});

// ---- Ability detail --------------------------------------------------------

app.get('/abilities/:name', async (c) => {
  const ability = await apiJson(`/ability/${encodeURIComponent(c.req.param('name'))}/`);
  if (!ability) return renderNotFound(c);

  const effect =
    ability.effect_entries?.find((e) => e.language.name === 'en')?.short_effect ?? MISSING;
  const cards = await speciesCardsFor(ability.pokemon ?? [], (ref) => ({ hidden: ref.is_hidden }));

  const enName = englishName(ability);
  return renderPage(
    c,
    enName,
    abilityPage({ name: enName, effect: collapseWhitespace(effect), cards }),
  );
});

// ---- Type list & detail ----------------------------------------------------

app.get('/types', async (c) => {
  const types = await allTypes();
  const labels = await typeEnglishByName();
  return renderPage(
    c,
    'Types',
    typeListPage(types.map((t) => ({ name: t.name, label: labels.get(t.name) ?? humanize(t.name) }))),
  );
});

app.get('/types/:name', async (c) => {
  const name = c.req.param('name');
  const types = await allTypes();
  const type = types.find((t) => t.name === name.toLowerCase());
  if (!type) return renderNotFound(c);

  const labels = await typeEnglishByName();
  const cards = await speciesCardsFor(type.pokemon ?? []);
  const moves = (type.moves ?? [])
    .map((m) => m.name)
    .sort((a, b) => humanize(a).localeCompare(humanize(b)));

  const enName = englishName(type);
  return renderPage(
    c,
    enName,
    typePage({ type, name: enName, typeLabels: Object.fromEntries(labels), cards, moves }),
  );
});

// ---- Fallback ---------------------------------------------------------------

app.notFound((c) => renderNotFound(c));

app.onError((err, c) => {
  console.error(err);
  return c.text('Internal Server Error', 500);
});
