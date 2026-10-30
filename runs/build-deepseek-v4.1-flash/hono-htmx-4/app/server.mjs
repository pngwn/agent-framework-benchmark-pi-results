import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { html } from 'hono/html';

import {
  NotFoundError,
  getAbility,
  getEvolutionChain,
  getGeneration,
  getGenerationList,
  getMove,
  getPokemon,
  getSpeciesByName,
  getSpeciesCatalog,
  getType,
  getTypeList,
  getVersionGroup,
  idFromUrl,
  spriteUrl,
} from './lib/api.mjs';
import {
  EM_DASH,
  dexNumber,
  displayValue,
  englishGenus,
  englishOrHumanized,
  heightInMetres,
  humanize,
  latestEnglishFlavorText,
  methodLabel,
  statLabel,
  typeLabel,
  weightInKilograms,
} from './lib/format.mjs';
import {
  countText,
  notFoundPage,
  pokemonCard,
  pokemonCardGrid,
  renderLayout,
  section,
  typeBadge,
  typeBadgeLink,
} from './views/layout.mjs';

const app = new Hono();

const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));
app.get('/tokens.css', serveStatic({ root: PUBLIC_DIR, path: '/tokens.css' }));
app.get('/styles.css', serveStatic({ root: PUBLIC_DIR, path: '/styles.css' }));
app.get('/htmx.min.js', serveStatic({ root: PUBLIC_DIR, path: '/htmx.min.js' }));

const HOME_PAGE_SIZE = 48;

function isHtmx(c) {
  return c.req.header('HX-Request') === 'true';
}

function normalizePage(value) {
  const number = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function buildQuery({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

function sortPokemonTypes(pokemon) {
  return [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot);
}

function speciesRefsToCards(refs) {
  return refs
    .map((ref) => ({ id: idFromUrl(ref.url), name: ref.name }))
    .filter((ref) => ref.id !== null && ref.id <= 10000)
    .sort((a, b) => a.id - b.id);
}

async function speciesCardsForRefs(refs, { hiddenBySpecies = null } = {}) {
  const catalog = await getSpeciesCatalog();
  const seen = new Set();
  const speciesList = [];
  for (const ref of speciesRefsToCards(refs)) {
    const species = catalog.byId.get(ref.id);
    if (!species || seen.has(species.id)) continue;
    seen.add(species.id);
    speciesList.push(species);
  }
  speciesList.sort((a, b) => a.id - b.id);
  return speciesList.map((species) => {
    let hidden = false;
    if (hiddenBySpecies) {
      const value = hiddenBySpecies.get(species.id);
      hidden = typeof value === 'function' ? value() : Boolean(value);
    }
    return pokemonCard({ species, hidden });
  });
}

async function getPokemonBase(name) {
  const species = await getSpeciesByName(name);
  const variety =
    species.varieties?.find((entry) => entry.is_default) ??
    species.varieties?.[0];
  const pokemon = await getPokemon(variety?.pokemon?.name ?? species.name);
  return { species, pokemon };
}

async function getPokemonMoveInfo(pokemon, requestedGame) {
  const versionGroupRefs = new Map();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      versionGroupRefs.set(detail.version_group.name, detail.version_group);
    }
  }

  const versionGroups = await Promise.all(
    [...versionGroupRefs.values()].map(async (ref) => {
      const detail = await getVersionGroup(ref.name);
      return { name: detail.name, order: detail.order };
    }),
  );
  versionGroups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const selected =
    requestedGame && versionGroups.some((group) => group.name === requestedGame)
      ? requestedGame
      : versionGroups.at(-1)?.name ?? null;

  if (!selected) return { versionGroups, selected: null, rows: [] };

  const selectedMoves = [];
  for (const moveEntry of pokemon.moves ?? []) {
    const matching = (moveEntry.version_group_details ?? []).filter(
      (detail) => detail.version_group.name === selected,
    );
    if (matching.length) selectedMoves.push({ moveEntry, matching });
  }

  const uniqueMoves = [
    ...new Set(selectedMoves.map(({ moveEntry }) => moveEntry.move.name)),
  ];
  const moveDetails = new Map(
    await Promise.all(
      uniqueMoves.map(async (name) => [name, await getMove(name)]),
    ),
  );

  const rows = [];
  const seen = new Set();
  for (const { moveEntry, matching } of selectedMoves) {
    const detail = moveDetails.get(moveEntry.move.name);
    if (!detail) continue;
    for (const versionDetail of matching) {
      const method = versionDetail.move_learn_method.name;
      const key = `${method}:${moveEntry.move.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        method,
        level: versionDetail.level_learned_at,
        moveApi: detail.name,
        moveName: englishOrHumanized(detail),
        type: detail.type?.name ?? null,
        category: detail.damage_class?.name ?? null,
        power: detail.power,
        accuracy: detail.accuracy,
        pp: detail.pp,
      });
    }
  }

  return { versionGroups, selected, rows };
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function compareMethods(a, b) {
  const aIndex = METHOD_ORDER.indexOf(a);
  const bIndex = METHOD_ORDER.indexOf(b);
  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;
  return methodLabel(a).localeCompare(methodLabel(b));
}

function valueForColumn(row, key) {
  if (key === 'move') return row.moveName;
  if (key === 'type') return row.type ? typeLabel(row.type) : null;
  if (key === 'category') return row.category ? methodLabel(row.category) : null;
  return row[key];
}

function isMissing(value) {
  return value === null || value === undefined || value === '' || value === EM_DASH;
}

function sortRows(rows, method, sortKey, direction) {
  const key = sortKey || (method === 'level-up' ? 'level' : 'move');
  const dir = direction === 'descending' ? 'descending' : 'ascending';
  const numeric = new Set(['level', 'power', 'accuracy', 'pp']).has(key);
  const sorted = [...rows].sort((a, b) => {
    const aValue = valueForColumn(a, key);
    const bValue = valueForColumn(b, key);
    const aMissing = isMissing(aValue);
    const bMissing = isMissing(bValue);
    if (aMissing && bMissing) return a.moveName.localeCompare(b.moveName);
    if (aMissing) return 1;
    if (bMissing) return -1;

    let result;
    if (numeric) result = Number(aValue) - Number(bValue);
    else result = String(aValue).localeCompare(String(bValue));
    if (result === 0) result = a.moveName.localeCompare(b.moveName);
    return dir === 'ascending' ? result : -result;
  });
  return sorted;
}

function moveTableHeader({ key, label, sortKey, direction, speciesName, game, method }) {
  const isSorted = sortKey === key;
  const nextDirection =
    isSorted && direction === 'ascending' ? 'descending' : 'ascending';
  const href = `/pokemon/${encodeURIComponent(speciesName)}/moves-table?${new URLSearchParams({
    game,
    method,
    sort: key,
    dir: nextDirection,
  }).toString()}`;
  const button = html`<button class="sort-button" type="button" hx-get="${href}" hx-target="closest table" hx-swap="outerHTML">${label}</button>`;
  return isSorted
    ? html`<th scope="col" aria-sort="${direction}">${button}</th>`
    : html`<th scope="col">${button}</th>`;
}

function renderMoveTable({
  method,
  rows,
  sortKey,
  direction,
  speciesName,
  game,
}) {
  const sortedRows = sortRows(rows, method, sortKey, direction);
  const hasLevel = method === 'level-up';
  const columns = [
    ...(hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];
  const tableId = `moves-table-${method}`;

  return html`<table id="${tableId}" class="moves-table">
    <caption>${methodLabel(method)}</caption>
    <thead>
      <tr>
        ${columns.map((column) =>
          moveTableHeader({
            key: column.key,
            label: column.label,
            sortKey,
            direction,
            speciesName,
            game,
            method,
          }),
        )}
      </tr>
    </thead>
    <tbody>
      ${sortedRows.map(
        (row) => html`<tr>
          ${hasLevel ? html`<td>${row.level}</td>` : ''}
          <td><a href="/moves/${row.moveApi}">${row.moveName}</a></td>
          <td>${row.type ? typeBadgeLink(row.type, { small: true }) : EM_DASH}</td>
          <td>${row.category ? methodLabel(row.category) : EM_DASH}</td>
          <td>${displayValue(row.power)}</td>
          <td>${displayValue(row.accuracy)}</td>
          <td>${displayValue(row.pp)}</td>
        </tr>`,
      )}
    </tbody>
  </table>`;
}

function renderMovesSection({ species, gameInfo, sortKey, direction }) {
  const grouped = new Map();
  for (const row of gameInfo.rows) {
    if (!grouped.has(row.method)) grouped.set(row.method, []);
    grouped.get(row.method).push(row);
  }
  const methods = [...grouped.keys()].sort(compareMethods);

  return html`<section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
    <h2 id="moves-heading">Moves</h2>
    <div class="moves-game">
      <label for="game">Game</label>
      <select id="game" name="game" hx-get="/pokemon/${species.name}" hx-target="#moves" hx-swap="outerHTML" hx-push-url="true" hx-trigger="change">
        ${gameInfo.versionGroups.map(
          (group) => html`<option value="${group.name}"${group.name === gameInfo.selected ? html` selected` : ''}>${humanize(group.name)}</option>`,
        )}
      </select>
    </div>
    <div class="moves-tables">
      ${methods.map((method) =>
        renderMoveTable({
          method,
          rows: grouped.get(method),
          sortKey,
          direction,
          speciesName: species.name,
          game: gameInfo.selected,
        }),
      )}
    </div>
  </section>`;
}

function renderEvolutionNode(node) {
  const children = node.evolves_to ?? [];
  return html`<li>
    <a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>
    ${children.length ? html`<ul>${children.map(renderEvolutionNode)}</ul>` : ''}
  </li>`;
}

function renderPokemonPage({ species, pokemon, evolution, gameInfo }) {
  const name = englishOrHumanized(species);
  const types = sortPokemonTypes(pokemon);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.other?.home?.front_default ??
    pokemon.sprites?.front_default ??
    spriteUrl(species.id);
  const stats = (pokemon.stats ?? []).map((entry) => ({
    label: statLabel(entry.stat.name),
    value: entry.base_stat,
  }));
  const total = stats.reduce((sum, stat) => sum + Number(stat.value), 0);
  const abilities = [...(pokemon.abilities ?? [])].sort((a, b) => a.slot - b.slot);
  const flavor = latestEnglishFlavorText(species.flavor_text_entries);
  const maxStat = Math.max(200, ...stats.map((stat) => Number(stat.value)));

  const summary = html`<div class="pokemon-summary">
    <div class="artwork-wrap">
      <img class="artwork" src="${artwork}" alt="${name}" width="288" height="288">
    </div>
    <div class="summary-info">
      <p class="dex-number summary-dex">${dexNumber(species.id)}</p>
      <h1>${name}</h1>
      ${englishGenus(species) ? html`<p class="genus">${englishGenus(species)}</p>` : ''}
      <div class="summary-types">
        ${types.map((type) => typeBadgeLink(type.type.name))}
      </div>
      <dl class="physical-facts">
        <div><dt>Height</dt><dd>${heightInMetres(pokemon.height)}</dd></div>
        <div><dt>Weight</dt><dd>${weightInKilograms(pokemon.weight)}</dd></div>
      </dl>
      ${flavor ? html`<p class="flavor-text">${flavor}</p>` : ''}
    </div>
  </div>`;

  const statsSection = section({
    id: 'stats',
    heading: 'Base stats',
    content: html`<table class="stats-table">
      <tbody>
        ${stats.map(
          (stat) => html`<tr>
            <th scope="row">${stat.label}</th>
            <td class="stat-value">${stat.value}</td>
            <td class="stat-bar-cell">
              <span class="stat-track"><span class="stat-bar" style="width: ${Math.min(100, (Number(stat.value) / maxStat) * 100).toFixed(1)}%"></span></span>
            </td>
          </tr>`,
        )}
        <tr class="total-row">
          <th scope="row">Total</th>
          <td class="stat-value">${total}</td>
          <td class="stat-bar-cell"></td>
        </tr>
      </tbody>
    </table>`,
  });

  const abilitiesSection = section({
    id: 'abilities',
    heading: 'Abilities',
    content: html`<ul class="plain-list">
      ${abilities.map(
        (entry) => html`<li><a href="/abilities/${entry.ability.name}">${humanize(entry.ability.name)}</a>${entry.is_hidden ? html` <span class="hidden-inline">(hidden)</span>` : ''}</li>`,
      )}
    </ul>`,
  });

  const evolutionSection = section({
    id: 'evolution',
    heading: 'Evolution',
    content: html`<ul class="evolution-tree">${renderEvolutionNode(evolution.chain)}</ul>`,
  });

  return html`${summary}
    ${statsSection}
    ${abilitiesSection}
    ${evolutionSection}
    ${renderMovesSection({ species, gameInfo })}`;
}

app.get('/', async (c) => {
  const catalog = await getSpeciesCatalog();
  const typeList = await getTypeList();
  const generationList = await getGenerationList();

  const rawQuery = c.req.query('q') ?? '';
  const q = rawQuery.trim() ? rawQuery : '';
  const typeParam = c.req.query('type') ?? '';
  const generationParam = c.req.query('generation') ?? '';
  const type = typeList.some((entry) => entry.name === typeParam) ? typeParam : '';
  const generation = generationList.some((entry) => entry.name === generationParam)
    ? generationParam
    : '';

  let matches = catalog.list;
  if (type) {
    const detail = await getType(type);
    const ids = new Set(
      (detail.pokemon ?? [])
        .map((entry) => idFromUrl(entry.pokemon.url))
        .filter((id) => id !== null && id <= 10000),
    );
    matches = matches.filter((species) => ids.has(species.id));
  }
  if (generation) {
    const detail = await getGeneration(generation);
    const ids = new Set(
      (detail.pokemon_species ?? []).map((entry) => idFromUrl(entry.url)),
    );
    matches = matches.filter((species) => ids.has(species.id));
  }
  if (q) {
    const needle = q.toLowerCase();
    matches = matches.filter((species) =>
      humanize(species.name).toLowerCase().includes(needle),
    );
  }

  const totalPages = Math.max(1, Math.ceil(matches.length / HOME_PAGE_SIZE));
  const requestedPage = normalizePage(c.req.query('page'));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * HOME_PAGE_SIZE;
  const pageSpecies = matches.slice(start, start + HOME_PAGE_SIZE);
  const pagePokemon = await Promise.all(
    pageSpecies.map((species) => getPokemon(species.id)),
  );
  const cards = pageSpecies.map((species, index) =>
    pokemonCard({
      species,
      types: sortPokemonTypes(pagePokemon[index]).map((entry) => ({
        name: entry.type.name,
      })),
    }),
  );

  const pagination = html`<div class="pagination">
    <span>Page ${page} of ${matches.length ? totalPages : 0}</span>
    ${page > 1
      ? html`<a href="${buildQuery({ q, type, generation, page: page - 1 })}">Previous page</a>`
      : ''}
    ${page < totalPages
      ? html`<a href="${buildQuery({ q, type, generation, page: page + 1 })}">Next page</a>`
      : ''}
  </div>`;

  const results = html`${countText(matches.length)}
    ${cards.length ? pokemonCardGrid(cards) : html`<p class="empty-state">No Pokémon found</p>`}
    ${matches.length ? pagination : ''}`;

  const cleanUrl = buildQuery({ q, type, generation, page });
  if (isHtmx(c)) {
    c.header('HX-Push-Url', cleanUrl);
    return c.html(String(results));
  }

  const controls = html`<form id="filters" class="filters" hx-get="/" hx-target="#results" hx-swap="innerHTML" hx-push-url="true" hx-trigger="input changed delay:200ms, change" hx-sync="this:replace">
    <div class="field field-search">
      <label for="search">Search</label>
      <input id="search" name="q" type="search" value="${q}" autocomplete="off">
    </div>
    <div class="field">
      <label for="type">Type</label>
      <select id="type" name="type">
        <option value="">All types</option>
        ${typeList.map(
          (entry) => html`<option value="${entry.name}"${entry.name === type ? html` selected` : ''}>${humanize(entry.name)}</option>`,
        )}
      </select>
    </div>
    <div class="field">
      <label for="generation">Generation</label>
      <select id="generation" name="generation">
        <option value="">All generations</option>
        ${generationList.map(
          (entry) => html`<option value="${entry.name}"${entry.name === generation ? html` selected` : ''}>${entry.label}</option>`,
        )}
      </select>
    </div>
  </form>`;

  const content = html`<h1>Pokémon</h1>
    ${controls}
    <div id="results">${results}</div>`;

  return c.html(
    String(
      renderLayout({
        documentTitle: 'Pokédex',
        content,
      }),
    ),
  );
});

app.get('/pokemon/:name/moves-table', async (c) => {
  try {
    const { species, pokemon } = await getPokemonBase(c.req.param('name'));
    const requestedGame = c.req.query('game') ?? '';
    const gameInfo = await getPokemonMoveInfo(pokemon, requestedGame);
    const method = c.req.query('method') ?? '';
    const rows = gameInfo.rows.filter((row) => row.method === method);
    if (!gameInfo.selected || !rows.length) throw new NotFoundError();
    const direction = c.req.query('dir') === 'descending' ? 'descending' : 'ascending';
    const allowedSorts = new Set([
      'level',
      'move',
      'type',
      'category',
      'power',
      'accuracy',
      'pp',
    ]);
    const sortKey = allowedSorts.has(c.req.query('sort')) ? c.req.query('sort') : null;
    return c.html(
      String(
        renderMoveTable({
          method,
          rows,
          sortKey,
          direction,
          speciesName: species.name,
          game: gameInfo.selected,
        }),
      ),
    );
  } catch (error) {
    if (error instanceof NotFoundError) return c.html(String(notFoundPage()), 404);
    throw error;
  }
});

app.get('/pokemon/:name', async (c) => {
  try {
    const { species, pokemon } = await getPokemonBase(c.req.param('name'));
    const requestedGame = c.req.query('game') ?? '';
    const gameInfo = await getPokemonMoveInfo(pokemon, requestedGame);
    const cleanUrl = gameInfo.selected
      ? `/pokemon/${species.name}?${new URLSearchParams({ game: gameInfo.selected }).toString()}`
      : `/pokemon/${species.name}`;

    if (isHtmx(c)) {
      c.header('HX-Push-Url', cleanUrl);
      return c.html(
        String(renderMovesSection({ species, gameInfo })),
      );
    }

    const evolution = await getEvolutionChain(species.evolution_chain.url);
    const content = renderPokemonPage({ species, pokemon, evolution, gameInfo });
    return c.html(
      String(
        renderLayout({
          documentTitle: `${englishOrHumanized(species)} – Pokédex`,
          content,
        }),
      ),
    );
  } catch (error) {
    if (error instanceof NotFoundError) return c.html(String(notFoundPage()), 404);
    throw error;
  }
});

app.get('/moves/:name', async (c) => {
  try {
    const move = await getMove(c.req.param('name'));
    const name = englishOrHumanized(move);
    const effectEntry = move.effect_entries?.find(
      (entry) => entry.language?.name === 'en',
    );
    const effect =
      effectEntry?.short_effect ||
      latestEnglishFlavorText(move.flavor_text_entries) ||
      EM_DASH;
    const cards = await speciesCardsForRefs(move.learned_by_pokemon ?? []);

    const content = html`<h1>${name}</h1>
      <div class="panel move-summary-panel">
        <dl class="move-facts">
          <div><dt>Type</dt><dd>${move.type ? typeBadgeLink(move.type.name) : EM_DASH}</dd></div>
          <div><dt>Category</dt><dd>${move.damage_class ? humanize(move.damage_class.name) : EM_DASH}</dd></div>
          <div><dt>Power</dt><dd>${displayValue(move.power)}</dd></div>
          <div><dt>Accuracy</dt><dd>${displayValue(move.accuracy)}</dd></div>
          <div><dt>PP</dt><dd>${displayValue(move.pp)}</dd></div>
        </dl>
      </div>
      ${section({
        id: 'effect',
        heading: 'Effect',
        content: html`<p>${effect}</p>`,
      })}
      ${section({
        id: 'learned-by',
        heading: 'Learned by',
        content: html`${countText(cards.length)}${cards.length ? pokemonCardGrid(cards) : html`<p class="empty-state">None</p>`}`,
      })}`;

    return c.html(
      String(
        renderLayout({
          documentTitle: `${name} – Pokédex`,
          content,
        }),
      ),
    );
  } catch (error) {
    if (error instanceof NotFoundError) return c.html(String(notFoundPage()), 404);
    throw error;
  }
});

app.get('/abilities/:name', async (c) => {
  try {
    const ability = await getAbility(c.req.param('name'));
    const name = englishOrHumanized(ability);
    const effectEntry = ability.effect_entries?.find(
      (entry) => entry.language?.name === 'en',
    );
    const effect = effectEntry?.short_effect || EM_DASH;

    const catalog = await getSpeciesCatalog();
    const hiddenBySpecies = new Map();
    const entries = [];
    for (const entry of ability.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url);
      if (id === null || id > 10000) continue;
      const species = catalog.byId.get(id);
      if (!species) continue;
      hiddenBySpecies.set(id, Boolean(hiddenBySpecies.get(id)) || entry.is_hidden);
      entries.push(species);
    }
    const seen = new Set();
    const speciesList = entries
      .filter((species) => {
        if (seen.has(species.id)) return false;
        seen.add(species.id);
        return true;
      })
      .sort((a, b) => a.id - b.id);
    const cards = speciesList.map((species) =>
      pokemonCard({ species, hidden: hiddenBySpecies.get(species.id) }),
    );

    const content = html`<h1>${name}</h1>
      ${section({
        id: 'effect',
        heading: 'Effect',
        content: html`<p>${effect}</p>`,
      })}
      ${section({
        id: 'pokemon',
        heading: 'Pokémon',
        content: html`${countText(cards.length)}${cards.length ? pokemonCardGrid(cards) : html`<p class="empty-state">None</p>`}`,
      })}`;

    return c.html(
      String(
        renderLayout({
          documentTitle: `${name} – Pokédex`,
          content,
        }),
      ),
    );
  } catch (error) {
    if (error instanceof NotFoundError) return c.html(String(notFoundPage()), 404);
    throw error;
  }
});

app.get('/types', async (c) => {
  const typeList = await getTypeList();
  const content = html`<h1>Types</h1>
    <ul class="type-grid">
      ${typeList.map(
        (entry) => html`<li><a class="type-grid-link type-${entry.name}" href="/types/${entry.name}">${humanize(entry.name)}</a></li>`,
      )}
    </ul>`;
  return c.html(
    String(
      renderLayout({
        documentTitle: 'Types – Pokédex',
        content,
      }),
    ),
  );
});

app.get('/types/:name', async (c) => {
  try {
    const type = await getType(c.req.param('name'));
    const name = englishOrHumanized(type);
    const relations = [
      ['Super effective against', type.damage_relations?.double_damage_to ?? []],
      ['Not very effective against', type.damage_relations?.half_damage_to ?? []],
      ['No effect against', type.damage_relations?.no_damage_to ?? []],
      ['Weak to', type.damage_relations?.double_damage_from ?? []],
      ['Resists', type.damage_relations?.half_damage_from ?? []],
      ['Immune to', type.damage_relations?.no_damage_from ?? []],
    ];

    const catalog = await getSpeciesCatalog();
    const seen = new Set();
    const speciesList = [];
    for (const entry of type.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url);
      if (id === null || id > 10000 || seen.has(id)) continue;
      const species = catalog.byId.get(id);
      if (!species) continue;
      seen.add(id);
      speciesList.push(species);
    }
    speciesList.sort((a, b) => a.id - b.id);
    const cards = speciesList.map((species) => pokemonCard({ species }));

    const moves = [...(type.moves ?? [])].sort((a, b) =>
      humanize(a.name).localeCompare(humanize(b.name)),
    );

    const content = html`<h1>${name}</h1>
      ${section({
        id: 'damage-relations',
        heading: 'Damage relations',
        content: html`<dl class="relations">
          ${relations.map(
            ([term, refs]) => html`<div class="relation">
              <dt>${term}</dt>
              <dd>${refs.length
                ? refs.map((ref) => typeBadgeLink(ref.name, { small: true }))
                : 'None'}</dd>
            </div>`,
          )}
        </dl>`,
      })}
      ${section({
        id: 'pokemon',
        heading: 'Pokémon',
        content: html`${countText(cards.length)}${cards.length ? pokemonCardGrid(cards) : html`<p class="empty-state">None</p>`}`,
      })}
      ${section({
        id: 'moves',
        heading: 'Moves',
        content: html`${countText(moves.length, 'moves')}<ul class="move-link-grid">
          ${moves.map((move) => html`<li><a href="/moves/${move.name}">${humanize(move.name)}</a></li>`)}
        </ul>`,
      })}`;

    return c.html(
      String(
        renderLayout({
          documentTitle: `${name} – Pokédex`,
          content,
        }),
      ),
    );
  } catch (error) {
    if (error instanceof NotFoundError) return c.html(String(notFoundPage()), 404);
    throw error;
  }
});

app.notFound((c) => c.html(String(notFoundPage()), 404));

app.onError((error, c) => {
  console.error(error);
  return c.text('Internal Server Error', 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Pokédex app listening on http://localhost:${info.port}`);
});
