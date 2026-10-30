import './tokens.css';
import './styles.css';

import {
  ApiError,
  api,
  displayValue,
  englishEntry,
  englishName,
  escapeAttr,
  escapeHtml,
  extractId,
  formatDex,
  humanize,
  latestEnglishFlavor,
  mapLimit,
} from './api.js';
import {
  buildSpeciesTypeMap,
  loadGenerations,
  loadSpecies,
  loadTypes,
  speciesIdsFromPokemonRefs,
  speciesRefsByIds,
} from './data.js';
import {
  panelHtml,
  pokemonCardListHtml,
  typeBadge,
} from './ui.js';

const main = document.getElementById('app');
const PAGE_SIZE = 48;

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const MOVE_METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

let renderToken = 0;
let searchTimer = null;

function normalizePath(pathname) {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Keep the raw path if it contains malformed escapes.
  }
  return path.replace(/\/+$/, '') || '/';
}

function setPage(html, title) {
  main.innerHTML = html;
  document.title = title;
}

function updateNav(path) {
  const section = path === '/types' || path.startsWith('/types/')
    ? 'types'
    : path === '/' || path.startsWith('/pokemon/')
      ? 'pokemon'
      : null;

  for (const link of document.querySelectorAll('.site-nav a')) {
    const href = link.getAttribute('href');
    if ((section === 'types' && href === '/types') || (section === 'pokemon' && href === '/')) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

function setNotFound() {
  setPage(
    `<h1>Not found</h1>
     <p class="not-found-text">The page you requested could not be found.</p>
     <p><a href="/">Back to Pokédex</a></p>`,
    'Not found – Pokédex',
  );
}

function afterRender() {
  if (location.hash) {
    const id = location.hash.slice(1);
    let target = null;
    try {
      target = document.getElementById(decodeURIComponent(id));
    } catch {
      target = document.getElementById(id);
    }
    if (target) {
      target.scrollIntoView({ block: 'start' });
      return;
    }
  }
  window.scrollTo(0, 0);
}

function readHomeFilters(url) {
  const page = Number.parseInt(url.searchParams.get('page') || '1', 10);
  return {
    q: url.searchParams.get('q') || '',
    type: url.searchParams.get('type') || '',
    generation: url.searchParams.get('generation') || '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function homeUrl(filters, page = filters.page) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/${query ? `?${query}` : ''}`;
}

function selectedAttribute(value, selected) {
  return value === selected ? ' selected' : '';
}

function renderHomeResults(context) {
  const { speciesData, typeBySpecies, generationData, filters, results } = context;
  const query = filters.q.trim().toLowerCase();

  const filtered = speciesData.refs.filter((species) => {
    if (query && !humanize(species.name).toLowerCase().includes(query)) return false;
    if (filters.type) {
      const types = typeBySpecies.get(species.id) || [];
      if (!types.some((type) => type.apiName === filters.type)) return false;
    }
    if (filters.generation && generationData.bySpecies.get(species.id) !== filters.generation) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  let html = `<p class="count-text">${filtered.length} Pokémon</p>`;

  if (!filtered.length) {
    html += '<p class="empty-state">No Pokémon found</p>';
  } else {
    html += pokemonCardListHtml(pageItems, (species) => ({
      types: typeBySpecies.get(species.id) || [],
    }));
  }

  html += `<nav class="pagination" aria-label="Pagination">
    <span class="page-status">Page ${page} of ${totalPages}</span>
    ${page > 1 ? `<a href="${escapeAttr(homeUrl(filters, page - 1))}" rel="prev">Previous page</a>` : ''}
    ${page < totalPages ? `<a href="${escapeAttr(homeUrl(filters, page + 1))}" rel="next">Next page</a>` : ''}
  </nav>`;

  results.innerHTML = html;
}

async function renderHome(token, url) {
  const [speciesData, typesData, generationData] = await Promise.all([
    loadSpecies(),
    loadTypes(),
    loadGenerations(),
  ]);
  if (token !== renderToken) return;

  const typeBySpecies = buildSpeciesTypeMap(typesData.canonical);
  const filters = readHomeFilters(url);

  const typeOptions = typesData.canonical
    .map(
      (type) =>
        `<option value="${escapeAttr(type.name)}"${selectedAttribute(type.name, filters.type)}>${escapeHtml(type.label)}</option>`,
    )
    .join('');

  const generationOptions = generationData.generations
    .map(
      (generation) =>
        `<option value="${escapeAttr(generation.name)}"${selectedAttribute(generation.name, filters.generation)}>${escapeHtml(generation.label)}</option>`,
    )
    .join('');

  setPage(
    `<h1>Pokémon</h1>
     <div class="home-controls">
       <div class="control control-search">
         <label for="search-input">Search</label>
         <input id="search-input" name="q" type="search" autocomplete="off" value="${escapeAttr(filters.q)}" />
       </div>
       <div class="control">
         <label for="type-filter">Type</label>
         <select id="type-filter" name="type">
           <option value="">All types</option>
           ${typeOptions}
         </select>
       </div>
       <div class="control">
         <label for="generation-filter">Generation</label>
         <select id="generation-filter" name="generation">
           <option value="">All generations</option>
           ${generationOptions}
         </select>
       </div>
     </div>
     <div id="home-results"></div>`,
    'Pokédex',
  );

  const context = {
    speciesData,
    typeBySpecies,
    generationData,
    filters,
    results: document.getElementById('home-results'),
  };

  const searchInput = document.getElementById('search-input');
  const typeSelect = document.getElementById('type-filter');
  const generationSelect = document.getElementById('generation-filter');

  const update = () => {
    if (token === renderToken) renderHomeResults(context);
  };

  searchInput.addEventListener('input', () => {
    filters.q = searchInput.value;
    filters.page = 1;
    update();

    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (token !== renderToken) return;
      history.replaceState(null, '', `${homeUrl(filters, 1)}${location.hash}`);
    }, 200);
  });

  typeSelect.addEventListener('change', () => {
    filters.type = typeSelect.value;
    filters.page = 1;
    update();
    history.pushState(null, '', `${homeUrl(filters, 1)}${location.hash}`);
  });

  generationSelect.addEventListener('change', () => {
    filters.generation = generationSelect.value;
    filters.page = 1;
    update();
    history.pushState(null, '', `${homeUrl(filters, 1)}${location.hash}`);
  });

  update();
}

async function renderTypeList(token) {
  const typesData = await loadTypes();
  if (token !== renderToken) return;

  const links = typesData.canonical
    .map(
      (type) =>
        `<li><a class="type-index-link type-${escapeAttr(type.name)}" href="/types/${escapeAttr(encodeURIComponent(type.name))}">${escapeHtml(type.label)}</a></li>`,
    )
    .join('');

  setPage(`<h1>Types</h1><ul class="type-index">${links}</ul>`, 'Types – Pokédex');
}

function evolutionNodeHtml(node) {
  if (!node?.species) return '';
  const species = node.species;
  const children = Array.isArray(node.evolves_to) ? node.evolves_to : [];
  return `<li>
    <a href="/pokemon/${escapeAttr(encodeURIComponent(species.name))}">${escapeHtml(humanize(species.name))}</a>
    ${children.length ? `<ul>${children.map(evolutionNodeHtml).join('')}</ul>` : ''}
  </li>`;
}

function statsTableHtml(stats) {
  let total = 0;
  const rows = stats.map((entry) => {
    const label = STAT_LABELS[entry.stat.name] || humanize(entry.stat.name);
    const value = Number(entry.base_stat) || 0;
    total += value;
    const width = Math.min(100, (value / 255) * 100);
    return `<tr>
      <th scope="row">${escapeHtml(label)}</th>
      <td class="stat-number">${value}</td>
      <td class="stat-bar-cell"><span class="stat-track"><span class="stat-fill" style="width: ${width}%"></span></span></td>
    </tr>`;
  }).join('');

  return `<table class="stats-table">
    <caption class="sr-only">Base stats</caption>
    <tbody>
      ${rows}
      <tr class="stat-total">
        <th scope="row">Total</th>
        <td class="stat-number">${total}</td>
        <td class="stat-bar-cell"></td>
      </tr>
    </tbody>
  </table>`;
}

function sortRows(rows, key, direction) {
  return [...rows].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    const aMissing = aValue === null || aValue === undefined || aValue === '—';
    const bMissing = bValue === null || bValue === undefined || bValue === '—';

    if (aMissing && bMissing) return a.moveName.localeCompare(b.moveName);
    if (aMissing) return 1;
    if (bMissing) return -1;

    let comparison;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    if (comparison === 0) comparison = a.moveName.localeCompare(b.moveName);
    return direction === 'descending' ? -comparison : comparison;
  });
}

function defaultRows(rows, method) {
  return [...rows].sort((a, b) => {
    if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
    return a.moveName.localeCompare(b.moveName);
  });
}

function moveTableHtml(method, rows, sort) {
  const isLevelUp = method === 'level-up';
  const sortedRows = sort
    ? sortRows(rows, sort.key, sort.direction)
    : defaultRows(rows, method);

  const header = (key, label) => {
    const active = sort?.key === key;
    const ariaSort = active ? sort.direction : 'none';
    return `<th scope="col" aria-sort="${ariaSort}" data-sort-key="${escapeAttr(key)}"><button type="button">${escapeHtml(label)}</button></th>`;
  };

  const body = sortedRows.map((row) => `<tr>
    ${isLevelUp ? `<td class="level-cell">${displayValue(row.level)}</td>` : ''}
    <td><a href="/moves/${escapeAttr(encodeURIComponent(row.moveApiName))}">${escapeHtml(row.moveName)}</a></td>
    <td><a class="type-badge type-${escapeAttr(row.typeApiName)}" href="/types/${escapeAttr(encodeURIComponent(row.typeApiName))}">${escapeHtml(row.typeLabel)}</a></td>
    <td>${escapeHtml(row.category)}</td>
    <td class="numeric-cell">${displayValue(row.power)}</td>
    <td class="numeric-cell">${displayValue(row.accuracy)}</td>
    <td class="numeric-cell">${displayValue(row.pp)}</td>
  </tr>`).join('');

  return `<table class="moves-table" data-method="${escapeAttr(method)}">
    <caption>${escapeHtml(humanize(method))}</caption>
    <thead><tr>
      ${isLevelUp ? header('level', 'Level') : ''}
      ${header('moveName', 'Move')}
      ${header('typeLabel', 'Type')}
      ${header('category', 'Category')}
      ${header('power', 'Power')}
      ${header('accuracy', 'Accuracy')}
      ${header('pp', 'PP')}
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function movesPanelHtml(state) {
  if (!state.groups.length) {
    return `<section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <p>No moves found.</p>
    </section>`;
  }

  const options = state.groups
    .map(
      (group) =>
        `<option value="${escapeAttr(group.name)}"${selectedAttribute(group.name, state.selected.name)}>${escapeHtml(group.label)}</option>`,
    )
    .join('');

  const presentMethods = [...state.rowsByMethod.keys()];
  const fixed = MOVE_METHOD_ORDER.filter((method) => presentMethods.includes(method));
  const others = presentMethods
    .filter((method) => !MOVE_METHOD_ORDER.includes(method))
    .sort((a, b) => humanize(a).localeCompare(humanize(b)));
  const methods = [...fixed, ...others];

  const tables = methods
    .map((method) => moveTableHtml(method, state.rowsByMethod.get(method), state.sorts[method]))
    .join('');

  return `<section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
    <h2 id="moves-heading">Moves</h2>
    <div class="game-control">
      <label for="game-select">Game</label>
      <select id="game-select" name="game">${options}</select>
    </div>
    <div class="move-tables">${tables}</div>
  </section>`;
}

function attachMovesHandlers(state, token) {
  const panel = document.getElementById('moves');
  if (!panel) return;

  const gameSelect = panel.querySelector('#game-select');
  gameSelect?.addEventListener('change', async () => {
    const selected = state.groups.find((group) => group.name === gameSelect.value);
    if (!selected || selected.name === state.selected.name) return;

    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('game', selected.name);
    history.pushState(null, '', nextUrl);

    state.selected = selected;
    state.sorts = {};
    state.rowsByMethod = await loadRowsForGame(state.pokemon, selected);
    if (token !== renderToken) return;

    const currentPanel = document.getElementById('moves');
    if (currentPanel) {
      currentPanel.outerHTML = movesPanelHtml(state);
      attachMovesHandlers(state, token);
    }
  });

  for (const table of panel.querySelectorAll('.moves-table')) {
    const method = table.dataset.method;
    for (const header of table.querySelectorAll('th[data-sort-key]')) {
      header.addEventListener('click', () => {
        const key = header.dataset.sortKey;
        const current = state.sorts[method];
        const direction = current?.key === key && current.direction === 'ascending'
          ? 'descending'
          : 'ascending';
        state.sorts[method] = { key, direction };

        const currentPanel = document.getElementById('moves');
        if (currentPanel) {
          currentPanel.outerHTML = movesPanelHtml(state);
          attachMovesHandlers(state, token);
        }
      });
    }
  }
}

async function loadRowsForGame(pokemon, selected) {
  const entries = [];
  for (const moveEntry of pokemon.moves || []) {
    for (const detail of moveEntry.version_group_details || []) {
      if (detail.version_group?.name !== selected.name) continue;
      entries.push({
        move: moveEntry.move,
        level: Number(detail.level_learned_at) || 0,
        method: detail.move_learn_method?.name || 'other',
      });
    }
  }

  const uniqueMoves = new Map();
  for (const entry of entries) {
    if (entry.move?.name && !uniqueMoves.has(entry.move.name)) {
      uniqueMoves.set(entry.move.name, entry.move);
    }
  }

  const moveDetails = await mapLimit(
    [...uniqueMoves.values()],
    16,
    (ref) => api(ref.url),
  );
  const detailsByName = new Map(moveDetails.map((move) => [move.name, move]));

  const byMethod = new Map();
  const seen = new Set();
  for (const entry of entries) {
    const move = detailsByName.get(entry.move?.name);
    if (!move) continue;

    const key = `${entry.method}|${move.name}|${entry.level}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const row = {
      level: entry.level,
      moveApiName: move.name,
      moveName: englishName(move.names, move.name),
      typeApiName: move.type?.name || 'unknown',
      typeLabel: humanize(move.type?.name || 'unknown'),
      category: humanize(move.damage_class?.name || '—'),
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    };

    const rows = byMethod.get(entry.method) || [];
    rows.push(row);
    byMethod.set(entry.method, rows);
  }

  return byMethod;
}

async function prepareMoves(pokemon, url) {
  const groupsByName = new Map();
  for (const moveEntry of pokemon.moves || []) {
    for (const detail of moveEntry.version_group_details || []) {
      const name = detail.version_group?.name;
      if (!name || groupsByName.has(name)) continue;
      groupsByName.set(name, {
        name,
        ref: detail.version_group,
        order: 0,
        label: humanize(name),
      });
    }
  }

  const groups = [...groupsByName.values()];
  const groupDetails = await mapLimit(groups, 12, (group) => api(group.ref.url));
  for (const detail of groupDetails) {
    const group = groupsByName.get(detail.name);
    if (group) group.order = Number(detail.order) || 0;
  }

  groups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const requested = url.searchParams.get('game');
  const selected = groups.find((group) => group.name === requested)
    || groups[groups.length - 1]
    || null;

  if (!selected) {
    return { pokemon, groups: [], selected: null, rowsByMethod: new Map(), sorts: {} };
  }

  return {
    pokemon,
    groups,
    selected,
    rowsByMethod: await loadRowsForGame(pokemon, selected),
    sorts: {},
  };
}

function summaryHtml(species, pokemon, typeLinks) {
  const englishTitle = englishName(species.names, species.name);
  const genus = englishEntry(species.genera)?.genus || '—';
  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default
    || pokemon.sprites?.other?.home?.front_default
    || pokemon.sprites?.front_default
    || '';
  const flavor = latestEnglishFlavor(species.flavor_text_entries);
  const height = (Number(pokemon.height) / 10).toFixed(1);
  const weight = (Number(pokemon.weight) / 10).toFixed(1);

  return `<div class="pokemon-summary">
    <div class="pokemon-artwork">
      ${artwork ? `<img src="${escapeAttr(artwork)}" alt="${escapeAttr(englishTitle)}" width="288" height="288" />` : ''}
    </div>
    <div class="pokemon-summary-info">
      <p class="dex-number">${formatDex(species.id)}</p>
      <h1>${escapeHtml(englishTitle)}</h1>
      <p class="genus">${escapeHtml(genus)}</p>
      <ul class="type-links">
        ${typeLinks.map((type) => `<li><a class="type-badge type-${escapeAttr(type.apiName)}" href="/types/${escapeAttr(encodeURIComponent(type.apiName))}">${escapeHtml(type.label)}</a></li>`).join('')}
      </ul>
      <dl class="measurements">
        <div><dt>Height</dt><dd>${height} m</dd></div>
        <div><dt>Weight</dt><dd>${weight} kg</dd></div>
      </dl>
      ${flavor ? `<p class="flavor-text">${escapeHtml(flavor)}</p>` : ''}
    </div>
  </div>`;
}

async function renderPokemon(token, name, url) {
  const species = await api(`/pokemon-species/${encodeURIComponent(name)}/`);
  if (token !== renderToken) return;

  const defaultVariety = (species.varieties || []).find((variety) => variety.is_default)
    || (species.varieties || [])[0];
  const pokemonRef = defaultVariety?.pokemon || {
    name: species.name,
    url: `/api/v2/pokemon/${species.id}/`,
  };

  const [pokemon, evolution] = await Promise.all([
    api(pokemonRef.url),
    species.evolution_chain?.url
      ? api(species.evolution_chain.url).catch(() => null)
      : Promise.resolve(null),
  ]);
  if (token !== renderToken) return;

  const sortedTypes = [...(pokemon.types || [])].sort((a, b) => a.slot - b.slot);
  const typeRecords = await Promise.all(
    sortedTypes.map((entry) => api(entry.type.url)),
  );
  if (token !== renderToken) return;

  const typeLinks = typeRecords.map((type) => ({
    apiName: type.name,
    label: englishName(type.names, type.name),
  }));

  const abilities = [...(pokemon.abilities || [])]
    .filter((entry) => entry.ability?.name)
    .sort((a, b) => a.slot - b.slot);

  const movesState = await prepareMoves(pokemon, url);
  if (token !== renderToken) return;

  const evolutionHtml = evolution?.chain
    ? `<ul class="evolution-list">${evolutionNodeHtml(evolution.chain)}</ul>`
    : `<ul class="evolution-list"><li><a href="/pokemon/${escapeAttr(encodeURIComponent(species.name))}">${escapeHtml(humanize(species.name))}</a></li></ul>`;

  const englishTitle = englishName(species.names, species.name);
  const html = `${summaryHtml(species, pokemon, typeLinks)}
    ${panelHtml('stats', 'Base stats', statsTableHtml(pokemon.stats || []))}
    ${panelHtml(
      'abilities',
      'Abilities',
      `<ul class="plain-list">${abilities.map((entry) => `<li><a href="/abilities/${escapeAttr(encodeURIComponent(entry.ability.name))}">${escapeHtml(humanize(entry.ability.name))}</a>${entry.is_hidden ? ' (hidden)' : ''}</li>`).join('')}</ul>`,
    )}
    ${panelHtml('evolution', 'Evolution', evolutionHtml)}
    ${movesPanelHtml(movesState)}`;

  setPage(html, `${englishTitle} – Pokédex`);
  attachMovesHandlers(movesState, token);
}

function detailsPanelHtml(rows) {
  return `<div class="panel move-details">${rows}</div>`;
}

async function renderMove(token, name) {
  const move = await api(`/move/${encodeURIComponent(name)}/`);
  if (token !== renderToken) return;

  const [type, speciesData] = await Promise.all([
    api(move.type.url),
    loadSpecies(),
  ]);
  if (token !== renderToken) return;

  const englishTitle = englishName(move.names, move.name);
  const typeLabel = englishName(type.names, type.name);
  const effectEntry = englishEntry(move.effect_entries);
  const effect = effectEntry?.short_effect
    || latestEnglishFlavor(move.flavor_text_entries)
    || '—';

  const ids = speciesIdsFromPokemonRefs(move.learned_by_pokemon);
  const cardSpecies = speciesRefsByIds(ids, speciesData);

  setPage(
    `<h1>${escapeHtml(englishTitle)}</h1>
     ${detailsPanelHtml(`<dl class="details-list">
       <div><dt>Type</dt><dd><a class="type-badge type-${escapeAttr(type.name)}" href="/types/${escapeAttr(encodeURIComponent(type.name))}">${escapeHtml(typeLabel)}</a></dd></div>
       <div><dt>Category</dt><dd>${escapeHtml(humanize(move.damage_class?.name || '—'))}</dd></div>
       <div><dt>Power</dt><dd>${displayValue(move.power)}</dd></div>
       <div><dt>Accuracy</dt><dd>${displayValue(move.accuracy)}</dd></div>
       <div><dt>PP</dt><dd>${displayValue(move.pp)}</dd></div>
     </dl>`)}
     ${panelHtml('effect', 'Effect', `<p>${escapeHtml(effect)}</p>`)}
     ${panelHtml('learned-by', 'Learned by', `<p class="count-text">${cardSpecies.length} Pokémon</p>${pokemonCardListHtml(cardSpecies)}`)}`,
    `${englishTitle} – Pokédex`,
  );
}

async function renderAbility(token, name) {
  const [ability, speciesData] = await Promise.all([
    api(`/ability/${encodeURIComponent(name)}/`),
    loadSpecies(),
  ]);
  if (token !== renderToken) return;

  const englishTitle = englishName(ability.names, ability.name);
  const effectEntry = englishEntry(ability.effect_entries);
  const effect = effectEntry?.short_effect || '—';

  const hiddenById = new Map();
  for (const entry of ability.pokemon || []) {
    const id = extractId(entry?.pokemon?.url);
    if (id === null || id >= 10000) continue;
    hiddenById.set(id, Boolean(hiddenById.get(id)) || Boolean(entry.is_hidden));
  }
  const cardSpecies = speciesRefsByIds([...hiddenById.keys()].sort((a, b) => a - b), speciesData);

  setPage(
    `<h1>${escapeHtml(englishTitle)}</h1>
     ${panelHtml('effect', 'Effect', `<p>${escapeHtml(effect)}</p>`)}
     ${panelHtml(
       'pokemon',
       'Pokémon',
       `<p class="count-text">${cardSpecies.length} Pokémon</p>${pokemonCardListHtml(
         cardSpecies,
         (species) => ({
           extraHtml: hiddenById.get(species.id)
             ? '<span class="hidden-ability">Hidden ability</span>'
             : '',
         }),
       )}`,
     )}`,
    `${englishTitle} – Pokédex`,
  );
}

async function renderType(token, name) {
  const [type, speciesData] = await Promise.all([
    api(`/type/${encodeURIComponent(name)}/`),
    loadSpecies(),
  ]);
  if (token !== renderToken) return;

  const englishTitle = englishName(type.names, type.name);
  const relations = [
    ['Super effective against', 'double_damage_to'],
    ['Not very effective against', 'half_damage_to'],
    ['No effect against', 'no_damage_to'],
    ['Weak to', 'double_damage_from'],
    ['Resists', 'half_damage_from'],
    ['Immune to', 'no_damage_from'],
  ];

  const relationHtml = relations.map(([term, key]) => {
    const related = moveRelationTypes(type.damage_relations?.[key] || []);
    const body = related.length
      ? related
        .map(
          (relatedType) =>
            `<a class="type-badge type-${escapeAttr(relatedType.name)}" href="/types/${escapeAttr(encodeURIComponent(relatedType.name))}">${escapeHtml(humanize(relatedType.name))}</a>`,
        )
        .join(' ')
      : 'None';
    return `<div class="relation"><dt>${escapeHtml(term)}</dt><dd>${body}</dd></div>`;
  }).join('');

  const ids = speciesIdsFromPokemonRefs(type.pokemon);
  const cardSpecies = speciesRefsByIds(ids, speciesData);
  const moves = [...(type.moves || [])].sort((a, b) =>
    humanize(a.name).localeCompare(humanize(b.name)),
  );

  setPage(
    `<h1>${escapeHtml(englishTitle)}</h1>
     ${panelHtml('damage-relations', 'Damage relations', `<dl class="relations-list">${relationHtml}</dl>`)}
     ${panelHtml('pokemon', 'Pokémon', `<p class="count-text">${cardSpecies.length} Pokémon</p>${pokemonCardListHtml(cardSpecies)}`)}
     ${panelHtml(
       'moves',
       'Moves',
       `<p class="count-text">${moves.length} moves</p><ul class="move-index">${moves
         .map(
           (move) =>
             `<li><a href="/moves/${escapeAttr(encodeURIComponent(move.name))}">${escapeHtml(humanize(move.name))}</a></li>`,
         )
         .join('')}</ul>`,
     )}`,
    `${englishTitle} – Pokédex`,
  );
}

function moveRelationTypes(types) {
  return [...types].sort((a, b) => humanize(a.name).localeCompare(humanize(b.name)));
}

async function renderRoute() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }

  const token = ++renderToken;
  const url = new URL(location.href);
  const path = normalizePath(url.pathname);
  const parts = path.split('/').filter(Boolean);
  updateNav(path);

  try {
    if (path === '/') {
      await renderHome(token, url);
    } else if (path === '/types') {
      await renderTypeList(token);
    } else if (parts.length === 2 && parts[0] === 'pokemon') {
      await renderPokemon(token, parts[1], url);
    } else if (parts.length === 2 && parts[0] === 'moves') {
      await renderMove(token, parts[1]);
    } else if (parts.length === 2 && parts[0] === 'abilities') {
      await renderAbility(token, parts[1]);
    } else if (parts.length === 2 && parts[0] === 'types') {
      await renderType(token, parts[1]);
    } else {
      setNotFound();
    }

    if (token === renderToken) afterRender();
  } catch (error) {
    if (token !== renderToken) return;
    if (error instanceof ApiError && error.status === 404) {
      setNotFound();
    } else {
      console.error(error);
      setNotFound();
    }
    afterRender();
  }
}

document.addEventListener('click', (event) => {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) {
    return;
  }

  const anchor = event.target.closest('a[href]');
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return;

  event.preventDefault();

  const samePage = url.pathname === location.pathname && url.search === location.search;
  if (samePage) {
    if (url.hash !== location.hash) {
      history.pushState(null, '', url);
      if (url.hash) {
        const target = document.getElementById(url.hash.slice(1));
        if (target) target.scrollIntoView({ block: 'start' });
      } else {
        window.scrollTo(0, 0);
      }
    }
    return;
  }

  history.pushState(null, '', url);
  renderRoute();
});

window.addEventListener('popstate', () => {
  renderRoute();
});

window.addEventListener('hashchange', () => {
  if (!location.hash) return;
  const target = document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView({ block: 'start' });
});

renderRoute();
