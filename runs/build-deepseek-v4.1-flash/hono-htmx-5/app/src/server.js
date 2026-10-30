import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { html } from 'hono/html';

import {
  englishName,
  getAbility,
  getEvolutionChain,
  getGenerationList,
  getGenerationSpecies,
  getMove,
  getPokemon,
  getSpeciesByName,
  getSpeciesIndex,
  getSpeciesList,
  getType,
  getTypeList,
  getTypeSpeciesIds,
  getVersionGroup,
  humanize,
  idFromUrl,
  isNotFound,
  parallelMap,
  spriteFor,
  typeLabel,
} from './api.js';
import { movesPanel, abilityPage, movePage, notFoundPage, pokemonPage, homePage, homeResults, typePage, typesPage } from './views/pages.js';

const app = new Hono();

app.use('*', serveStatic({ root: './dist' }));

const PER_PAGE = 48;

function cleanQuery(value) {
  return (value ?? '').trim();
}

function canonicalHomeUrl(filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

async function speciesEntriesFromRefs(refs) {
  const speciesIndex = await getSpeciesIndex();
  const found = new Map();
  for (const ref of refs) {
    const id = idFromUrl(ref?.url);
    if (id == null || id > 10000) continue;
    const existing = found.get(id);
    if (existing) {
      if (ref.hidden) existing.hidden = true;
      continue;
    }
    found.set(id, {
      id,
      name: speciesIndex.get(id)?.name ?? ref.name,
      hidden: Boolean(ref.hidden),
    });
  }
  return [...found.values()].sort((a, b) => a.id - b.id);
}

async function buildCards(entries, { showTypes = false } = {}) {
  return parallelMap(entries, 32, async (entry) => {
    let pokemon = null;
    try {
      pokemon = await getPokemon(entry.id);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    const types = showTypes
      ? [...(pokemon?.types ?? [])]
          .sort((a, b) => a.slot - b.slot)
          .map((item) => item.type.name)
      : null;
    return {
      id: entry.id,
      name: entry.name,
      sprite: spriteFor(pokemon, entry.id),
      types,
      hidden: entry.hidden,
    };
  });
}

function responseNotFound(c) {
  return c.html(notFoundPage(), 404);
}

app.get('/', async (c) => {
  const filters = {
    q: cleanQuery(c.req.query('q')),
    type: cleanQuery(c.req.query('type')),
    generation: cleanQuery(c.req.query('generation')),
  };

  const [speciesList, typeList, generationList] = await Promise.all([
    getSpeciesList(),
    getTypeList(),
    getGenerationList(),
  ]);

  let matching = speciesList;

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    matching = matching.filter((species) => humanize(species.name).toLowerCase().includes(needle));
  }

  if (filters.generation) {
    try {
      const names = await getGenerationSpecies(filters.generation);
      matching = matching.filter((species) => names.has(species.name));
    } catch (error) {
      if (!isNotFound(error)) throw error;
      matching = [];
    }
  }

  if (filters.type) {
    try {
      const ids = await getTypeSpeciesIds(filters.type);
      matching = matching.filter((species) => ids.has(species.id));
    } catch (error) {
      if (!isNotFound(error)) throw error;
      matching = [];
    }
  }

  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  let page = Number.parseInt(c.req.query('page') ?? '1', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const pageSpecies = matching.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const cards = await buildCards(pageSpecies, { showTypes: true });
  const results = { filters, total, page, totalPages, cards };

  if (c.req.header('HX-Request')) {
    c.header('HX-Push-Url', canonicalHomeUrl(filters));
    return c.html(homeResults(results));
  }

  return c.html(
    homePage({
      filters,
      types: typeList.map((type) => ({ name: type.name, label: typeLabel(type.name) })),
      generations: generationList.map((generation) => ({ name: generation.name, label: generation.label })),
      results,
    }),
  );
});

async function buildGames(pokemon) {
  const names = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      names.add(detail.version_group.name);
    }
  }

  const games = await parallelMap([...names], 12, async (name) => {
    try {
      const record = await getVersionGroup(name);
      return { name, label: humanize(name), order: record.order ?? 9999 };
    } catch (error) {
      if (!isNotFound(error)) throw error;
      return { name, label: humanize(name), order: 9999 };
    }
  });

  games.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return games;
}

function moveCell(value, missing = false) {
  return {
    value: missing ? 0 : value,
    missing,
    content: missing ? '—' : String(value),
  };
}

async function buildMoveTables(pokemon, gameName) {
  const rawRows = [];
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== gameName) continue;
      rawRows.push({
        moveName: move.move.name,
        method: detail.move_learn_method.name,
        level: detail.level_learned_at ?? 0,
      });
    }
  }

  const moveNames = [...new Set(rawRows.map((row) => row.moveName))];
  const moveRecords = await parallelMap(moveNames, 32, async (name) => {
    try {
      return await getMove(name);
    } catch (error) {
      if (!isNotFound(error)) throw error;
      return null;
    }
  });
  const movesByName = new Map(moveNames.map((name, index) => [name, moveRecords[index]]));

  const rowsByMethod = new Map();
  for (const row of rawRows) {
    if (!rowsByMethod.has(row.method)) rowsByMethod.set(row.method, []);
    rowsByMethod.get(row.method).push(row);
  }

  const preferredOrder = ['level-up', 'machine', 'egg', 'tutor'];
  const methodNames = [...rowsByMethod.keys()].sort((a, b) => {
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);
    if (indexA !== -1 || indexB !== -1) {
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    }
    return humanize(a).localeCompare(humanize(b)) || a.localeCompare(b);
  });

  return methodNames.map((method) => {
    const rows = rowsByMethod.get(method).map((raw) => {
      const move = movesByName.get(raw.moveName);
      const moveLabel = move ? englishName(move) : humanize(raw.moveName);
      const typeName = move?.type?.name ?? '';
      const typeNameLabel = typeName ? typeLabel(typeName) : '—';
      const categoryLabel = move?.damage_class?.name ? humanize(move.damage_class.name) : '—';
      const power = move?.power ?? null;
      const accuracy = move?.accuracy ?? null;
      const pp = move?.pp ?? null;
      return {
        level: raw.level,
        moveLabel,
        moveName: raw.moveName,
        typeName,
        typeNameLabel,
        categoryLabel,
        power,
        accuracy,
        pp,
        cells: {
          level: moveCell(raw.level),
          move: {
            value: moveLabel.toLowerCase(),
            missing: false,
            content: html`<a href="/moves/${raw.moveName}">${moveLabel}</a>`,
          },
          type: {
            value: typeNameLabel.toLowerCase(),
            missing: false,
            content: typeName
              ? html`<a class="type-badge type-${typeName}" href="/types/${typeName}">${typeNameLabel}</a>`
              : '—',
          },
          category: {
            value: categoryLabel.toLowerCase(),
            missing: false,
            content: categoryLabel,
          },
          power: moveCell(power, power == null),
          accuracy: moveCell(accuracy, accuracy == null),
          pp: moveCell(pp, pp == null),
        },
      };
    });

    rows.sort((a, b) => {
      if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
      return a.moveLabel.localeCompare(b.moveLabel) || a.level - b.level;
    });

    return { method, label: humanize(method), rows };
  });
}

app.get('/pokemon/:name', async (c) => {
  const name = c.req.param('name');
  try {
    const species = await getSpeciesByName(name);
    const [pokemon, evolution] = await Promise.all([
      getPokemon(species.id),
      species.evolution_chain ? getEvolutionChain(species.evolution_chain.url) : Promise.resolve(null),
    ]);

    const games = await buildGames(pokemon);
    const requestedGame = cleanQuery(c.req.query('game'));
    const selectedGame =
      games.find((game) => game.name === requestedGame)?.name ?? games[games.length - 1]?.name;
    const movesTables = selectedGame ? await buildMoveTables(pokemon, selectedGame) : [];

    if (c.req.header('HX-Request')) {
      const url = selectedGame
        ? `/pokemon/${species.name}?game=${encodeURIComponent(selectedGame)}`
        : `/pokemon/${species.name}`;
      c.header('HX-Push-Url', url);
      return c.html(
        movesPanel({
          speciesName: species.name,
          games,
          selectedGame,
          tables: movesTables,
        }),
      );
    }

    return c.html(
      pokemonPage({
        species,
        pokemon,
        evolution,
        games,
        selectedGame,
        movesTables,
        abilities: pokemon.abilities ?? [],
      }),
    );
  } catch (error) {
    if (isNotFound(error)) return responseNotFound(c);
    throw error;
  }
});

app.get('/moves/:name', async (c) => {
  try {
    const move = await getMove(c.req.param('name'));
    const entries = await speciesEntriesFromRefs(move.learned_by_pokemon ?? []);
    const cards = await buildCards(entries);
    return c.html(movePage({ move, cards }));
  } catch (error) {
    if (isNotFound(error)) return responseNotFound(c);
    throw error;
  }
});

app.get('/abilities/:name', async (c) => {
  const name = c.req.param('name');
  try {
    const ability = await getAbility(name);
    const refs = (ability.pokemon ?? []).map((entry) => ({
      ...entry.pokemon,
      hidden: entry.is_hidden,
    }));
    const entries = await speciesEntriesFromRefs(refs);
    const cards = await buildCards(entries);
    return c.html(abilityPage({ ability, cards }));
  } catch (error) {
    if (isNotFound(error)) return responseNotFound(c);
    throw error;
  }
});

app.get('/types', async (c) => {
  const typeList = await getTypeList();
  return c.html(typesPage({ types: typeList }));
});

app.get('/types/:name', async (c) => {
  const name = c.req.param('name');
  try {
    const type = await getType(name);
    const entries = await speciesEntriesFromRefs((type.pokemon ?? []).map((entry) => entry.pokemon));
    const cards = await buildCards(entries);
    const uniqueMoves = new Map();
    for (const move of type.moves ?? []) {
      uniqueMoves.set(move.name, humanize(move.name));
    }
    const moveLinks = [...uniqueMoves.entries()]
      .map(([moveName, label]) => ({ name: moveName, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return c.html(typePage({ type, cards, moveLinks }));
  } catch (error) {
    if (isNotFound(error)) return responseNotFound(c);
    throw error;
  }
});

app.notFound((c) => responseNotFound(c));

app.onError((error, c) => {
  console.error(error);
  return c.text('Internal Server Error', 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex app listening on http://localhost:${info.port}`);
});
