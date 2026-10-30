import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import {
  apiOrNull,
  englishName,
  humanize,
  latestEnglishFlavor,
  mapLimit,
  paddedDex,
} from './lib/api.js';
import {
  cardsFromPokemonEntries,
  cardsFromRefs,
  getGenerationCatalog,
  getHomeData,
  getTypeCatalog,
  getVersionCatalog,
  typeLabel,
} from './lib/catalog.js';
import {
  esc,
  pokemonCards,
  renderLayout,
  section,
  typeBadge,
  typeBadges,
} from './lib/render.js';

const app = new Hono();
const PAGE_SIZE = 48;
const appRoot = new URL('./', import.meta.url);
const styles = readFileSync(new URL('./public/styles.css', appRoot), 'utf8');
const tokens = readFileSync(new URL('./public/tokens.css', appRoot), 'utf8');
const htmx = readFileSync(new URL('./node_modules/htmx.org/dist/htmx.min.js', appRoot), 'utf8');

app.get('/styles.css', (c) =>
  c.body(styles, 200, { 'Content-Type': 'text/css; charset=utf-8' }),
);
app.get('/tokens.css', (c) =>
  c.body(tokens, 200, { 'Content-Type': 'text/css; charset=utf-8' }),
);
app.get('/htmx.min.js', (c) =>
  c.body(htmx, 200, { 'Content-Type': 'text/javascript; charset=utf-8' }),
);

function page(title, body) {
  return renderLayout({ title, body });
}

function notFoundPage() {
  return page(
    'Not found – Pokédex',
    `<h1>Not found</h1>
<p><a href="/">Back to the Pokédex</a></p>`,
  );
}

function notFound(c) {
  return c.html(notFoundPage(), 404);
}

function homeUrl({ q, type, generation, pageNumber }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (pageNumber > 1) params.set('page', String(pageNumber));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

app.get('/', async (c) => {
  const url = new URL(c.req.url);
  const q = url.searchParams.get('q') ?? '';
  const type = url.searchParams.get('type') ?? '';
  const generation = url.searchParams.get('generation') ?? '';
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1;

  const [allSpecies, types, generations] = await Promise.all([
    getHomeData(),
    getTypeCatalog(),
    getGenerationCatalog(),
  ]);

  const needle = q.toLowerCase();
  const filtered = allSpecies.filter((entry) => {
    if (needle && !entry.label.toLowerCase().includes(needle)) return false;
    if (type && !entry.types.some((item) => item.name === type)) return false;
    if (generation && entry.generation !== generation) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageNumber = Math.min(Math.max(1, requestedPage), totalPages);
  const visible = filtered.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);

  const typeOptions = types.list
    .map(
      (entry) =>
        `<option value="${esc(entry.name)}"${entry.name === type ? ' selected' : ''}>${esc(
          entry.label,
        )}</option>`,
    )
    .join('');
  const generationOptions = generations.list
    .map(
      (entry) =>
        `<option value="${esc(entry.name)}"${
          entry.name === generation ? ' selected' : ''
        }>${esc(entry.label)}</option>`,
    )
    .join('');

  const cards = visible.length
    ? pokemonCards(visible, { showTypes: true })
    : '<p class="empty">No Pokémon found</p>';

  const previous =
    pageNumber > 1
      ? `<a class="page-link" href="${esc(
          homeUrl({ q, type, generation, pageNumber: pageNumber - 1 }),
        )}">Previous page</a>`
      : '';
  const next =
    pageNumber < totalPages
      ? `<a class="page-link" href="${esc(
          homeUrl({ q, type, generation, pageNumber: pageNumber + 1 }),
        )}">Next page</a>`
      : '';
  const pagination = filtered.length
    ? `<div class="pagination">${previous}<span>Page ${pageNumber} of ${totalPages}</span>${next}</div>`
    : '';

  const canonical = homeUrl({ q, type, generation, pageNumber });
  if (c.req.header('HX-Request') === 'true') c.header('HX-Push-Url', canonical);

  const body = `<h1>Pokémon</h1>
<form id="filters" class="filters" action="/" method="get"
  hx-get="/" hx-target="#results" hx-select="#results" hx-swap="outerHTML" hx-push-url="true"
  hx-trigger="input changed delay:200ms from:input[type='search'], change from:select">
  <div class="field field-search">
    <label for="search">Search</label>
    <input id="search" name="q" type="search" value="${esc(q)}" autocomplete="off">
  </div>
  <div class="field">
    <label for="type">Type</label>
    <select id="type" name="type">
      <option value="">All types</option>
      ${typeOptions}
    </select>
  </div>
  <div class="field">
    <label for="generation">Generation</label>
    <select id="generation" name="generation">
      <option value="">All generations</option>
      ${generationOptions}
    </select>
  </div>
</form>
<div id="results">
  <p class="count">${filtered.length} Pokémon</p>
  ${cards}
  ${pagination}
</div>`;

  return c.html(page('Pokédex', body));
});

app.get('/pokemon/:name', async (c) => {
  const name = c.req.param('name');
  const url = new URL(c.req.url);

  const species = await apiOrNull(
    `/api/v2/pokemon-species/${encodeURIComponent(name)}/`,
  );
  if (!species) return notFound(c);

  const variety =
    species.varieties?.find((item) => item.is_default) ?? species.varieties?.[0];
  if (!variety) return notFound(c);

  const [pokemon, types, versions, chain] = await Promise.all([
    apiOrNull(`/api/v2/pokemon/${encodeURIComponent(variety.pokemon.name)}/`),
    getTypeCatalog(),
    getVersionCatalog(),
    species.evolution_chain?.url ? apiOrNull(species.evolution_chain.url) : null,
  ]);
  if (!pokemon) return notFound(c);

  const displayName = englishName(species);
  const genus =
    species.genera?.find((item) => item.language?.name === 'en')?.genus ?? '—';
  const flavor = latestEnglishFlavor(species) ?? '—';
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    '';

  const pokemonTypes = [...(pokemon.types ?? [])]
    .sort((a, b) => a.slot - b.slot)
    .map((slot) => ({
      name: slot.type.name,
      label: typeLabel(types, slot.type.name),
    }));

  const statLabels = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };
  const stats = pokemon.stats ?? [];
  const statRows = stats
    .map((stat) => {
      const label = statLabels[stat.stat.name] ?? humanize(stat.stat.name);
      const width = Math.max(0, Math.min(100, (stat.base_stat / 255) * 100));
      return `<tr>
  <th scope="row">${esc(label)}</th>
  <td class="stat-value">${stat.base_stat}</td>
  <td class="stat-bar-cell"><span class="stat-track"><span class="stat-fill" style="width:${width.toFixed(
    2,
  )}%"></span></span></td>
</tr>`;
    })
    .join('');
  const statTotal = stats.reduce((sum, stat) => sum + stat.base_stat, 0);

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => {
      const abilityName = entry.ability.name;
      return `<li><a href="/abilities/${encodeURIComponent(
        abilityName,
      )}">${esc(humanize(abilityName))}</a>${
        entry.is_hidden ? ' <span class="muted">(hidden)</span>' : ''
      }</li>`;
    })
    .join('');

  const evolution = chain?.chain
    ? `<ul class="evolution-tree">${renderEvolutionNode(chain.chain)}</ul>`
    : '<p>—</p>';

  const groupsInMoves = new Set();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      groupsInMoves.add(detail.version_group.name);
    }
  }
  const availableGroups = versions.list.filter((group) =>
    groupsInMoves.has(group.name),
  );
  const requestedGame = url.searchParams.get('game');
  const selectedGroup =
    (requestedGame && availableGroups.find((group) => group.name === requestedGame)) ||
    availableGroups.at(-1) ||
    null;

  const movesContent = await renderMovesContent({
    pokemon,
    species,
    types,
    typeCatalog: types,
    selectedGroup,
    availableGroups,
    url,
  });

  const typeLinks = typeBadges(pokemonTypes, { links: true });

  const body = `<div class="pokemon-hero">
  <div class="artwork-card">
    ${
      artwork
        ? `<img class="official-artwork" src="${esc(
            artwork,
          )}" alt="${esc(displayName)}">`
        : ''
    }
  </div>
  <div class="pokemon-intro">
    <p class="dex-number">${esc(paddedDex(species.id))}</p>
    <h1>${esc(displayName)}</h1>
    <p class="genus">${esc(genus)}</p>
    <div class="pokemon-types">${typeLinks}</div>
    <dl class="measurements">
      <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
      <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
    </dl>
    <p class="flavor-text">${esc(flavor)}</p>
  </div>
</div>
${section(
  'stats',
  'Base stats',
  `<table class="stats-table">
  <tbody>
    ${statRows}
    <tr class="stat-total"><th scope="row">Total</th><td class="stat-value">${statTotal}</td><td class="stat-bar-cell"><span class="stat-track"><span class="stat-fill" style="width:${Math.min(
      100,
      (statTotal / (255 * 6)) * 100,
    ).toFixed(2)}%"></span></span></td></tr>
  </tbody>
</table>`,
)}
${section('abilities', 'Abilities', `<ul class="plain-list">${abilities || '<li>—</li>'}</ul>`)}
${section('evolution', 'Evolution', evolution)}
<section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  ${movesContent}
</section>`;

  return c.html(page(`${displayName} – Pokédex`, body));
});

function renderEvolutionNode(node) {
  const name = node.species.name;
  const children = node.evolves_to ?? [];
  return `<li><a href="/pokemon/${encodeURIComponent(name)}">${esc(
    humanize(name),
  )}</a>${
    children.length
      ? `<ul>${children.map((child) => renderEvolutionNode(child)).join('')}</ul>`
      : ''
  }</li>`;
}

async function renderMovesContent({
  pokemon,
  species,
  typeCatalog,
  selectedGroup,
  availableGroups,
  url,
}) {
  if (!selectedGroup) {
    return '<div id="moves-content"><p>—</p></div>';
  }

  const selected = selectedGroup.name;
  const entries = [];
  const seen = new Set();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group.name !== selected) continue;
      const method = detail.move_learn_method.name;
      const key = `${method}|${moveEntry.move.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        method,
        moveName: moveEntry.move.name,
        level: Number.isFinite(detail.level_learned_at)
          ? detail.level_learned_at
          : null,
      });
    }
  }

  const uniqueMoveNames = [...new Set(entries.map((entry) => entry.moveName))];
  const moveDetails = await mapLimit(uniqueMoveNames, 24, (moveName) =>
    apiOrNull(`/api/v2/move/${encodeURIComponent(moveName)}/`),
  );
  const movesByName = new Map(
    moveDetails.filter(Boolean).map((move) => [move.name, move]),
  );

  const rows = entries
    .map((entry) => {
      const move = movesByName.get(entry.moveName);
      if (!move) return null;
      const typeName = move.type?.name ?? null;
      return {
        method: entry.method,
        level: entry.level,
        moveName: entry.moveName,
        moveLabel: englishName(move, entry.moveName),
        typeName,
        typeLabel: typeName ? typeLabel(typeCatalog, typeName) : null,
        category: move.damage_class ? humanize(move.damage_class.name) : null,
        power: move.power ?? null,
        accuracy: move.accuracy ?? null,
        pp: move.pp ?? null,
      };
    })
    .filter(Boolean);

  const methodKeys = [...new Set(rows.map((row) => row.method))];
  const preferred = ['level-up', 'machine', 'egg', 'tutor'];
  const sortedMethods = [...methodKeys].sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return humanize(a).localeCompare(humanize(b));
  });

  const sortMethod = url.searchParams.get('sortMethod');
  const sortKey = url.searchParams.get('sort');
  const sortDir = url.searchParams.get('dir') === 'descending' ? 'descending' : 'ascending';
  const speciesPath = `/pokemon/${encodeURIComponent(species.name)}`;

  const options = availableGroups
    .map(
      (group) =>
        `<option value="${esc(group.name)}"${
          group.name === selected ? ' selected' : ''
        }>${esc(group.label)}</option>`,
    )
    .join('');

  const gameForm = `<form class="game-form" hx-get="${esc(
    speciesPath,
  )}" hx-target="#moves-content" hx-select="#moves-content" hx-swap="outerHTML" hx-push-url="true" hx-trigger="change">
  <div class="field game-field">
    <label for="game">Game</label>
    <select id="game" name="game">${options}</select>
  </div>
</form>`;

  const tables = sortedMethods
    .map((method) => {
      const methodRows = rows.filter((row) => row.method === method);
      const methodLabel = humanize(method);
      const tableId = `moves-table-${method.replace(/[^a-z0-9-]/g, '-')}`;
      const active = sortMethod === method;
      const activeKey = active ? sortKey : null;
      const activeDir = active ? sortDir : null;

      if (method === 'level-up') {
        methodRows.sort(
          (a, b) =>
            compareValues(a.level, b.level, 'ascending') ||
            a.moveLabel.localeCompare(b.moveLabel) ||
            a.moveName.localeCompare(b.moveName),
        );
      } else {
        methodRows.sort(
          (a, b) =>
            a.moveLabel.localeCompare(b.moveLabel) ||
            a.moveName.localeCompare(b.moveName),
        );
      }

      const columns =
        method === 'level-up'
          ? [
              ['level', 'Level'],
              ['move', 'Move'],
              ['type', 'Type'],
              ['category', 'Category'],
              ['power', 'Power'],
              ['accuracy', 'Accuracy'],
              ['pp', 'PP'],
            ]
          : [
              ['move', 'Move'],
              ['type', 'Type'],
              ['category', 'Category'],
              ['power', 'Power'],
              ['accuracy', 'Accuracy'],
              ['pp', 'PP'],
            ];

      if (active && activeKey && columns.some(([key]) => key === activeKey)) {
        methodRows.sort((a, b) =>
          compareRows(a, b, activeKey, activeDir),
        );
      }

      const headers = columns
        .map(([key, label]) => {
          const isActive = active && activeKey === key;
          const ariaSort = isActive ? activeDir : 'none';
          const nextDir =
            isActive && activeDir === 'ascending' ? 'descending' : 'ascending';
          const params = new URLSearchParams({
            game: selected,
            sortMethod: method,
            sort: key,
            dir: nextDir,
          });
          return `<th scope="col" aria-sort="${ariaSort}"><button type="button" class="sort-button" hx-get="${esc(
            `${speciesPath}?${params.toString()}`,
          )}" hx-target="#${esc(tableId)}" hx-select="#${esc(
            tableId,
          )}" hx-swap="outerHTML" hx-push-url="false">${esc(label)}</button></th>`;
        })
        .join('');

      const bodyRows = methodRows
        .map((row) => {
          const cells = [];
          if (method === 'level-up') {
            cells.push(`<td>${row.level == null ? '—' : row.level}</td>`);
          }
          cells.push(
            `<td><a href="/moves/${encodeURIComponent(row.moveName)}">${esc(
              row.moveLabel,
            )}</a></td>`,
          );
          cells.push(
            `<td>${
              row.typeName
                ? typeBadge(row.typeName, row.typeLabel, { link: true })
                : '—'
            }</td>`,
          );
          cells.push(`<td>${row.category == null ? '—' : esc(row.category)}</td>`);
          cells.push(`<td>${row.power == null ? '—' : row.power}</td>`);
          cells.push(`<td>${row.accuracy == null ? '—' : row.accuracy}</td>`);
          cells.push(`<td>${row.pp == null ? '—' : row.pp}</td>`);
          return `<tr>${cells.join('')}</tr>`;
        })
        .join('');

      return `<table class="moves-table" id="${esc(
        tableId,
      )}"><caption>${esc(methodLabel)}</caption><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    })
    .join('');

  return `<div id="moves-content">${gameForm}${tables}</div>`;
}

function missing(value) {
  return value === null || value === undefined || value === '';
}

function compareValues(a, b, direction) {
  const am = missing(a);
  const bm = missing(b);
  if (am && bm) return 0;
  if (am) return 1;
  if (bm) return -1;
  let result;
  if (typeof a === 'number' && typeof b === 'number') {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b));
  }
  return direction === 'descending' ? -result : result;
}

function compareRows(a, b, key, direction) {
  const values = {
    level: (row) => row.level,
    move: (row) => row.moveLabel,
    type: (row) => row.typeLabel,
    category: (row) => row.category,
    power: (row) => row.power,
    accuracy: (row) => row.accuracy,
    pp: (row) => row.pp,
  };
  const get = values[key] ?? ((row) => row.moveLabel);
  return compareValues(get(a), get(b), direction);
}

app.get('/moves/:name', async (c) => {
  const name = c.req.param('name');
  const [move, types] = await Promise.all([
    apiOrNull(`/api/v2/move/${encodeURIComponent(name)}/`),
    getTypeCatalog(),
  ]);
  if (!move) return notFound(c);

  const typeName = move.type?.name ?? null;
  const type = typeName ? typeLabel(types, typeName) : '—';
  const category = move.damage_class ? humanize(move.damage_class.name) : '—';
  const shortEffect = move.effect_entries?.find(
    (entry) => entry.language?.name === 'en',
  )?.short_effect;
  const effect = shortEffect || latestEnglishFlavor(move) || '—';

  const learnedBy = await cardsFromRefs(move.learned_by_pokemon ?? []);
  const title = englishName(move);

  const body = `<h1>${esc(title)}</h1>
<div class="panel move-facts">
  <dl class="inline-facts">
    <div><dt>Type</dt><dd>${
      typeName ? typeBadge(typeName, type, { link: true }) : '—'
    }</dd></div>
    <div><dt>Category</dt><dd>${esc(category)}</dd></div>
    <div><dt>Power</dt><dd>${move.power ?? '—'}</dd></div>
    <div><dt>Accuracy</dt><dd>${move.accuracy ?? '—'}</dd></div>
    <div><dt>PP</dt><dd>${move.pp ?? '—'}</dd></div>
  </dl>
</div>
${section('effect', 'Effect', `<p>${esc(effect)}</p>`)}
${section(
  'learned-by',
  'Learned by',
  `<p class="count">${learnedBy.length} Pokémon</p>${pokemonCards(learnedBy)}`,
)}`;

  return c.html(page(`${title} – Pokédex`, body));
});

app.get('/abilities/:name', async (c) => {
  const name = c.req.param('name');
  const ability = await apiOrNull(
    `/api/v2/ability/${encodeURIComponent(name)}/`,
  );
  if (!ability) return notFound(c);

  const effect =
    ability.effect_entries?.find((entry) => entry.language?.name === 'en')
      ?.short_effect || '—';
  const pokemon = await cardsFromPokemonEntries(ability.pokemon ?? []);
  const title = englishName(ability);

  const body = `<h1>${esc(title)}</h1>
${section('effect', 'Effect', `<p>${esc(effect)}</p>`)}
${section(
  'pokemon',
  'Pokémon',
  `<p class="count">${pokemon.length} Pokémon</p>${pokemonCards(pokemon)}`,
)}`;

  return c.html(page(`${title} – Pokédex`, body));
});

app.get('/types', async (c) => {
  const types = await getTypeCatalog();
  const items = types.list
    .map(
      (type) =>
        `<li><a class="type-tile type-${esc(type.name)}" href="/types/${encodeURIComponent(
          type.name,
        )}">${esc(type.label)}</a></li>`,
    )
    .join('');
  return c.html(
    page('Types – Pokédex', `<h1>Types</h1><ul class="type-grid">${items}</ul>`),
  );
});

app.get('/types/:name', async (c) => {
  const name = c.req.param('name');
  const [types, type] = await Promise.all([
    getTypeCatalog(),
    apiOrNull(`/api/v2/type/${encodeURIComponent(name)}/`),
  ]);
  if (!type) return notFound(c);

  const relations = type.damage_relations ?? {};
  const relationDefinitions = [
    ['Super effective against', relations.double_damage_to],
    ['Not very effective against', relations.half_damage_to],
    ['No effect against', relations.no_damage_to],
    ['Weak to', relations.double_damage_from],
    ['Resists', relations.half_damage_from],
    ['Immune to', relations.no_damage_from],
  ];
  const relationList = relationDefinitions
    .map(([label, relationTypes]) => {
      const items = relationTypes ?? [];
      const content = items.length
        ? items
            .map((item) =>
              typeBadge(item.name, typeLabel(types, item.name), { link: true }),
            )
            .join('')
        : 'None';
      return `<div><dt>${esc(label)}</dt><dd>${content}</dd></div>`;
    })
    .join('');

  const pokemon = await cardsFromRefs(
    (type.pokemon ?? []).map((entry) => entry.pokemon),
  );
  const moves = [...(type.moves ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (move) =>
        `<li><a href="/moves/${encodeURIComponent(move.name)}">${esc(
          humanize(move.name),
        )}</a></li>`,
    )
    .join('');

  const title = englishName(type);
  const body = `<h1>${esc(title)}</h1>
${section('damage-relations', 'Damage relations', `<dl class="relations">${relationList}</dl>`)}
${section(
  'pokemon',
  'Pokémon',
  `<p class="count">${pokemon.length} Pokémon</p>${pokemonCards(pokemon)}`,
)}
${section(
  'moves',
  'Moves',
  `<p class="count">${type.moves?.length ?? 0} moves</p><ul class="move-links">${moves}</ul>`,
)}`;

  return c.html(page(`${title} – Pokédex`, body));
});

app.notFound(notFound);

app.onError((error, c) => {
  console.error(error);
  return c.html(notFoundPage(), 500);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Pokédex listening on http://localhost:${info.port}`);
});
