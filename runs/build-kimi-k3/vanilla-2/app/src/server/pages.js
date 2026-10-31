// Server-side page renderers. Each returns { status, title, main }.
import {
  record,
  getList,
  mapLimit,
  getSpeciesSummaries,
  speciesForPokemonRef,
  speciesCardsForPokemonRefs,
  spriteUrl,
  NotFoundError,
} from './api.js';
import {
  humanize,
  englishName,
  latestEnglishFlavor,
  collapseWhitespace,
  idFromUrl,
  dexNumber,
  escapeHtml,
  escapeJsonForHtml,
  formatMeters,
  formatKilograms,
} from '../shared/format.js';
import { typeBadge, speciesCard, section } from '../shared/components.js';
import { filterSummaries, homeResultsHtml, parseHomeState } from '../shared/home-view.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const MISSING = '—';

async function the18Types() {
  const list = await getList('type');
  return list.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => t.name);
}

const num = (value) => (value == null ? MISSING : String(value));

// ---------------------------------------------------------------- home page

async function homePage(searchParams) {
  const [{ summaries, generations }, types] = await Promise.all([
    getSpeciesSummaries(),
    the18Types(),
  ]);
  const state = parseHomeState(searchParams);
  if (state.type && !types.includes(state.type)) state.type = '';
  if (state.generation && !generations.some((g) => g.name === state.generation)) {
    state.generation = '';
  }
  const option = (value, label, current) =>
    `<option value="${escapeHtml(value)}"${value === current ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const main = `
<h1>Pokémon</h1>
<div class="controls">
  <div class="field field-search">
    <label for="filter-search">Search</label>
    <input type="search" id="filter-search" value="${escapeHtml(state.q)}" autocomplete="off">
  </div>
  <div class="field">
    <label for="filter-type">Type</label>
    <select id="filter-type">
      ${option('', 'All types', state.type)}
      ${types.map((t) => option(t, humanize(t), state.type)).join('')}
    </select>
  </div>
  <div class="field">
    <label for="filter-generation">Generation</label>
    <select id="filter-generation">
      ${option('', 'All generations', state.generation)}
      ${generations.map((g) => option(g.name, g.label, state.generation)).join('')}
    </select>
  </div>
</div>
<div id="results">${homeResultsHtml(filterSummaries(summaries, state), state)}</div>
<script type="application/json" id="species-data">${escapeJsonForHtml(JSON.stringify(summaries))}</script>`;
  return { status: 200, title: 'Pokédex', main };
}

// ------------------------------------------------------------ pokémon page

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function evolutionNode(node) {
  const name = node.species.name;
  let html = `<li><a href="/pokemon/${encodeURIComponent(name)}">${escapeHtml(humanize(name))}</a>`;
  if (node.evolves_to?.length) {
    html += `<ul>${node.evolves_to.map(evolutionNode).join('')}</ul>`;
  }
  return `${html}</li>`;
}

function sortableHeader(key, label) {
  return `<th scope="col" data-sort-key="${key}"><button type="button">${escapeHtml(label)}</button></th>`;
}

function movesTable(method, rows) {
  const isLevelUp = method === 'level-up';
  const headers =
    (isLevelUp ? sortableHeader('level', 'Level') : '') +
    sortableHeader('move', 'Move') +
    sortableHeader('type', 'Type') +
    sortableHeader('category', 'Category') +
    sortableHeader('power', 'Power') +
    sortableHeader('accuracy', 'Accuracy') +
    sortableHeader('pp', 'PP');
  const body = rows
    .map(
      (r) =>
        `<tr>` +
        (isLevelUp ? `<td>${r.level}</td>` : '') +
        `<td><a href="/moves/${encodeURIComponent(r.apiName)}">${escapeHtml(r.name)}</a></td>` +
        `<td>${typeBadge(r.type, { link: true })}</td>` +
        `<td>${escapeHtml(r.category)}</td>` +
        `<td>${r.power}</td>` +
        `<td>${r.accuracy}</td>` +
        `<td>${r.pp}</td>` +
        `</tr>`,
    )
    .join('');
  return (
    `<table class="moves-table">` +
    `<caption>${escapeHtml(humanize(method))}</caption>` +
    `<thead><tr>${headers}</tr></thead>` +
    `<tbody>${body}</tbody>` +
    `</table>`
  );
}

async function movesSection(pokemon, searchParams) {
  // Version groups in which this Pokémon learns moves, ordered by their `order`.
  const versionGroupIds = new Map();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      const name = detail.version_group.name;
      if (!versionGroupIds.has(name)) versionGroupIds.set(name, idFromUrl(detail.version_group.url));
    }
  }
  const versionGroups = await mapLimit([...versionGroupIds.entries()], 16, ([name, id]) =>
    record('version-group', id),
  );
  versionGroups.sort((a, b) => a.order - b.order);
  const games = versionGroups.map((g) => g.name);

  let game = searchParams.get('game') ?? '';
  if (!games.includes(game)) game = games[games.length - 1] ?? '';

  // Moves learned in the selected version group, grouped by learn method.
  const entries = [];
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== game) continue;
      entries.push({
        moveId: idFromUrl(move.move.url),
        apiName: move.move.name,
        method: detail.move_learn_method.name,
        level: detail.level_learned_at,
      });
    }
  }
  const moveIds = [...new Set(entries.map((e) => e.moveId))];
  const moveRecords = await mapLimit(moveIds, 16, (id) => record('move', id));
  const moveById = new Map(moveRecords.map((m) => [m.id, m]));

  const byMethod = new Map();
  for (const entry of entries) {
    const rec = moveById.get(entry.moveId);
    const row = {
      level: entry.level,
      apiName: entry.apiName,
      name: englishName(rec.names) ?? humanize(entry.apiName),
      type: rec.type?.name ?? '',
      category: rec.damage_class ? humanize(rec.damage_class.name) : MISSING,
      power: num(rec.power),
      accuracy: num(rec.accuracy),
      pp: num(rec.pp),
    };
    if (!byMethod.has(entry.method)) byMethod.set(entry.method, []);
    byMethod.get(entry.method).push(row);
  }

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const tables = methods
    .map((method) => {
      const rows = byMethod.get(method);
      rows.sort((a, b) =>
        method === 'level-up'
          ? a.level - b.level || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      );
      return movesTable(method, rows);
    })
    .join('');

  const options = games
    .map(
      (g) =>
        `<option value="${escapeHtml(g)}"${g === game ? ' selected' : ''}>${escapeHtml(humanize(g))}</option>`,
    )
    .join('');
  const inner = `
  <div class="field game-field">
    <label for="game-select">Game</label>
    <select id="game-select">${options}</select>
  </div>
  ${tables}`;
  return section('moves-heading', 'Moves', inner, { id: 'moves', className: 'moves-panel' });
}

async function pokemonPage(name, searchParams) {
  const species = await record('pokemon-species', name);
  const variety = species.varieties?.find((v) => v.is_default) ?? species.varieties?.[0];
  const pokemon = await record('pokemon', idFromUrl(variety.pokemon.url));
  const chain = await record('evolution-chain', idFromUrl(species.evolution_chain.url));

  const displayName = englishName(species.names) ?? humanize(species.name);
  const genus = (species.genera ?? []).find((g) => g.language?.name === 'en')?.genus ?? null;
  const flavor = latestEnglishFlavor(species.flavor_text_entries);
  const types = [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.other?.home?.front_default ??
    pokemon.sprites?.front_default ??
    spriteUrl(species.id);

  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const statRows = stats
    .map(
      (s) =>
        `<tr><th scope="row">${escapeHtml(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name))}</th>` +
        `<td class="stat-value">${s.base_stat}</td>` +
        `<td class="stat-bar-cell"><span class="stat-bar" style="width:${Math.min(100, (s.base_stat / 255) * 100)}%"></span></td></tr>`,
    )
    .join('');
  const statsTable =
    `<table class="stats-table"><tbody>${statRows}` +
    `<tr class="stat-total"><th scope="row">Total</th><td class="stat-value">${total}</td>` +
    `<td class="stat-bar-cell"><span class="stat-bar" style="width:${Math.min(100, (total / 720) * 100)}%"></span></td></tr>` +
    `</tbody></table>`;

  const abilities = [...(pokemon.abilities ?? [])].sort((a, b) => a.slot - b.slot);
  const abilitiesList = `<ul class="plain-list">${abilities
    .map(
      (a) =>
        `<li><a href="/abilities/${encodeURIComponent(a.ability.name)}">${escapeHtml(humanize(a.ability.name))}</a>${a.is_hidden ? ' (hidden)' : ''}</li>`,
    )
    .join('')}</ul>`;

  const evolution = `<ul class="evolution-tree">${evolutionNode(chain.chain)}</ul>`;

  const main = `
<div class="panel summary-panel">
  <p class="artwork-frame"><img class="artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(displayName)}" width="288" height="288"></p>
  <div class="summary-info">
    <p class="dex-number">${dexNumber(species.id)}</p>
    <h1>${escapeHtml(displayName)}</h1>
    ${genus ? `<p class="genus">${escapeHtml(genus)}</p>` : ''}
    <p class="summary-types">${types.map((t) => typeBadge(t, { link: true })).join('')}</p>
    <dl class="facts">
      <div class="fact"><dt>Height</dt><dd>${formatMeters(pokemon.height)}</dd></div>
      <div class="fact"><dt>Weight</dt><dd>${formatKilograms(pokemon.weight)}</dd></div>
    </dl>
  </div>
  ${flavor ? `<p class="flavor">${escapeHtml(flavor)}</p>` : ''}
</div>
${section('stats-heading', 'Base stats', statsTable)}
${section('abilities-heading', 'Abilities', abilitiesList)}
${section('evolution-heading', 'Evolution', evolution)}
${await movesSection(pokemon, searchParams)}`;
  return { status: 200, title: `${displayName} – Pokédex`, main };
}

// ---------------------------------------------------------------- move page

async function movePage(name) {
  const move = await record('move', name);
  const displayName = englishName(move.names) ?? humanize(move.name);
  const enEffects = (move.effect_entries ?? []).filter((e) => e.language?.name === 'en');
  const effect =
    (enEffects.length ? collapseWhitespace(enEffects[enEffects.length - 1].short_effect) : null) ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    MISSING;

  const learners = await speciesCardsForPokemonRefs(move.learned_by_pokemon ?? []);
  const cards = learners.map((s) => speciesCard(s)).join('');
  const learnedBy = section(
    'learned-by-heading',
    'Learned by',
    `<p class="result-count">${learners.length} Pokémon</p><ul class="card-grid">${cards}</ul>`,
  );

  const facts = `
<div class="panel summary-panel">
  <dl class="facts facts-move">
    <div class="fact"><dt>Type</dt><dd>${move.type ? typeBadge(move.type.name, { link: true }) : MISSING}</dd></div>
    <div class="fact"><dt>Category</dt><dd>${move.damage_class ? escapeHtml(humanize(move.damage_class.name)) : MISSING}</dd></div>
    <div class="fact"><dt>Power</dt><dd>${num(move.power)}</dd></div>
    <div class="fact"><dt>Accuracy</dt><dd>${num(move.accuracy)}</dd></div>
    <div class="fact"><dt>PP</dt><dd>${num(move.pp)}</dd></div>
  </dl>
</div>`;
  const main = `
<h1>${escapeHtml(displayName)}</h1>
${facts}
${section('effect-heading', 'Effect', `<p>${escapeHtml(effect)}</p>`)}
${learnedBy}`;
  return { status: 200, title: `${displayName} – Pokédex`, main };
}

// ------------------------------------------------------------- ability page

async function abilityPage(name) {
  const ability = await record('ability', name);
  const displayName = englishName(ability.names) ?? humanize(ability.name);
  const enEffects = (ability.effect_entries ?? []).filter((e) => e.language?.name === 'en');
  const effect =
    (enEffects.length ? collapseWhitespace(enEffects[enEffects.length - 1].short_effect) : null) ??
    latestEnglishFlavor(ability.flavor_text_entries) ??
    MISSING;

  const hiddenBySpecies = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    hiddenBySpecies.set(id, (hiddenBySpecies.get(id) ?? false) || entry.is_hidden);
  }
  const holders = await speciesCardsForPokemonRefs(ability.pokemon ?? [], {
    extraFor: (entry, species) =>
      hiddenBySpecies.get(species.id) ? `<span class="hidden-note">Hidden ability</span>` : '',
  });
  const cards = holders.map((s) => speciesCard(s, { extra: s.extra })).join('');
  const main = `
<h1>${escapeHtml(displayName)}</h1>
${section('effect-heading', 'Effect', `<p>${escapeHtml(effect)}</p>`)}
${section(
  'pokemon-heading',
  'Pokémon',
  `<p class="result-count">${holders.length} Pokémon</p><ul class="card-grid">${cards}</ul>`,
)}`;
  return { status: 200, title: `${displayName} – Pokédex`, main };
}

// ---------------------------------------------------------------- type pages

async function typesPage() {
  const types = await the18Types();
  const items = types
    .map(
      (t) =>
        `<li><a class="type-tile type-${escapeHtml(t)}" href="/types/${encodeURIComponent(t)}">${escapeHtml(humanize(t))}</a></li>`,
    )
    .join('');
  const main = `<h1>Types</h1><ul class="type-list">${items}</ul>`;
  return { status: 200, title: 'Types – Pokédex', main };
}

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

async function typePage(name) {
  const type = await record('type', name);
  const displayName = englishName(type.names) ?? humanize(type.name);

  const relations = RELATIONS.map(([term, key]) => {
    const related = type.damage_relations?.[key] ?? [];
    const value = related.length
      ? related.map((t) => typeBadge(t.name, { link: true })).join('')
      : 'None';
    return `<div class="relation"><dt>${escapeHtml(term)}</dt><dd>${value}</dd></div>`;
  }).join('');
  const damageRelations = section(
    'damage-relations-heading',
    'Damage relations',
    `<dl class="relations">${relations}</dl>`,
  );

  const holders = await speciesCardsForPokemonRefs((type.pokemon ?? []).map((p) => p.pokemon));
  const pokemonCards = holders.map((s) => speciesCard(s)).join('');
  const pokemonSection = section(
    'pokemon-heading',
    'Pokémon',
    `<p class="result-count">${holders.length} Pokémon</p><ul class="card-grid">${pokemonCards}</ul>`,
  );

  const moves = [...(type.moves ?? [])].sort((a, b) =>
    humanize(a.name).localeCompare(humanize(b.name)),
  );
  const moveItems = moves
    .map(
      (m) =>
        `<li><a href="/moves/${encodeURIComponent(m.name)}">${escapeHtml(humanize(m.name))}</a></li>`,
    )
    .join('');
  const movesSectionHtml = section(
    'moves-heading',
    'Moves',
    `<p class="result-count">${moves.length} moves</p><ul class="move-list">${moveItems}</ul>`,
  );

  const main = `
<h1>${escapeHtml(displayName)}</h1>
${damageRelations}
${pokemonSection}
${movesSectionHtml}`;
  return { status: 200, title: `${displayName} – Pokédex`, main };
}

// --------------------------------------------------------------- not found

function notFoundPage() {
  const main = `
<h1>Not found</h1>
<p><a href="/">Back to the Pokédex</a></p>`;
  return { status: 404, title: 'Not found – Pokédex', main };
}

// ------------------------------------------------------------------ router

export async function renderPage(route, searchParams) {
  try {
    switch (route.name) {
      case 'home':
        return await homePage(searchParams);
      case 'pokemon':
        return await pokemonPage(route.param, searchParams);
      case 'moves':
        return await movePage(route.param);
      case 'abilities':
        return await abilityPage(route.param);
      case 'types':
        return route.param ? await typePage(route.param) : await typesPage();
      default:
        return notFoundPage();
    }
  } catch (err) {
    if (err instanceof NotFoundError) return notFoundPage();
    throw err;
  }
}
