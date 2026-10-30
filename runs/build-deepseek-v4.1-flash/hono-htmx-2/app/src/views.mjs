import {
  englishGenus,
  englishName,
  englishShortEffect,
  formatDex,
  formatValue,
  getAbility,
  getDefaultPokemon,
  getEvolutionChain,
  getGenerationCatalog,
  getMove,
  getSpecies,
  getSpeciesCatalog,
  getTypeCatalog,
  getVersionGroup,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
  pokemonTypes,
  spriteUrl,
  statLabel,
} from './api.mjs';
import {
  cardGrid,
  escapeHtml,
  layout,
  notFoundPage,
  pageTitle,
  renderHomeResults,
  section,
  typeBadge,
  typeBadges,
} from './render.mjs';

const PAGE_SIZE = 48;

export async function getHomeData({ q, type, generation, page }) {
  const [speciesCatalog, typeCatalog, generations] = await Promise.all([
    getSpeciesCatalog(),
    getTypeCatalog(),
    getGenerationCatalog(),
  ]);

  let matching = speciesCatalog.list;

  if (type) {
    const selectedType = typeCatalog.byName.get(type);
    matching = selectedType
      ? matching.filter((species) =>
          (typeCatalog.byPokemon.get(species.id) ?? []).some((entry) => entry.name === selectedType.name),
        )
      : [];
  }

  if (generation) {
    const selectedGeneration = generations.find((entry) => entry.name === generation);
    matching = selectedGeneration ? matching.filter((species) => selectedGeneration.species.has(species.id)) : [];
  }

  if (q) {
    const needle = q.toLowerCase();
    matching = matching.filter((species) => humanize(species.name).toLowerCase().includes(needle));
  }

  const count = matching.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(totalPages, page));
  const start = (currentPage - 1) * PAGE_SIZE;
  const items = matching.slice(start, start + PAGE_SIZE).map((species) => ({
    id: species.id,
    name: species.name,
    types: (typeCatalog.byPokemon.get(species.id) ?? []).map((entry) => entry.name),
  }));

  return {
    speciesCatalog,
    typeCatalog,
    generations,
    items,
    count,
    page: currentPage,
    totalPages,
    query: { q, type, generation },
  };
}

export function renderHomePage(data, { partial = false } = {}) {
  const results = renderHomeResults(data);
  if (partial) return results;

  const { q, type, generation } = data.query;
  const typeOptions = [
    `<option value=""${type ? '' : ' selected'}>All types</option>`,
    ...data.typeCatalog.types.map(
      (entry) =>
        `<option value="${escapeHtml(entry.name)}"${entry.name === type ? ' selected' : ''}>${escapeHtml(entry.display)}</option>`,
    ),
  ].join('');
  const generationOptions = [
    `<option value=""${generation ? '' : ' selected'}>All generations</option>`,
    ...data.generations.map(
      (entry) =>
        `<option value="${escapeHtml(entry.name)}"${entry.name === generation ? ' selected' : ''}>${escapeHtml(entry.display)}</option>`,
    ),
  ].join('');

  return `<h1 class="page-title">Pokémon</h1>
<form class="filters"
      hx-get="/"
      hx-target="#pokemon-results"
      hx-swap="outerHTML"
      hx-push-url="true"
      hx-include="this"
      hx-trigger="input changed delay:300ms, change">
  <div class="field field-search">
    <label for="search">Search</label>
    <input id="search" name="q" type="search" value="${escapeHtml(q)}" autocomplete="off">
  </div>
  <div class="field">
    <label for="type-filter">Type</label>
    <select id="type-filter" name="type">${typeOptions}</select>
  </div>
  <div class="field">
    <label for="generation-filter">Generation</label>
    <select id="generation-filter" name="generation">${generationOptions}</select>
  </div>
</form>
${results}`;
}

export function renderTypesPage(typeCatalog) {
  const items = typeCatalog.types
    .map((type) => `<li>${typeBadge(type.name, { link: true, label: type.display })}</li>`)
    .join('');
  return `<h1 class="page-title">Types</h1>
<ul class="type-grid">${items}</ul>`;
}

const dedupeSortedPokemonEntries = (entries) => {
  const seen = new Set();
  return (entries ?? [])
    .map((entry) => ({ ...entry, id: idFromUrl(entry.pokemon?.url) }))
    .filter((entry) => Number.isFinite(entry.id) && entry.id <= 10000)
    .sort((a, b) => a.id - b.id)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
};

export function renderTypePage(type, speciesCatalog, typeCatalog) {
  const pokemonEntries = dedupeSortedPokemonEntries(type.data.pokemon);
  const cards = pokemonEntries
    .map((entry) => {
      const species = speciesCatalog.byId.get(entry.id);
      return species ? { id: entry.id, name: species.name } : null;
    })
    .filter(Boolean);

  const relationDefinitions = [
    ['Super effective against', 'double_damage_to'],
    ['Not very effective against', 'half_damage_to'],
    ['No effect against', 'no_damage_to'],
    ['Weak to', 'double_damage_from'],
    ['Resists', 'half_damage_from'],
    ['Immune to', 'no_damage_from'],
  ];
  const relations = relationDefinitions
    .map(([label, key]) => {
      const relatedTypes = type.data.damage_relations?.[key] ?? [];
      const content = relatedTypes.length
        ? relatedTypes
            .map((related) =>
              typeBadge(related.name, {
                link: true,
                label: typeCatalog.byName.get(related.name)?.display ?? humanize(related.name),
              }),
            )
            .join(' ')
        : 'None';
      return `<div class="relation"><dt>${escapeHtml(label)}</dt><dd>${content}</dd></div>`;
    })
    .join('');

  const moves = [...(type.data.moves ?? [])].sort((a, b) =>
    humanize(a.name).localeCompare(humanize(b.name)),
  );
  const moveLinks = moves
    .map(
      (move) =>
        `<li><a href="/moves/${encodeURIComponent(move.name)}">${escapeHtml(humanize(move.name))}</a></li>`,
    )
    .join('');

  return `<h1 class="page-title">${escapeHtml(type.display)}</h1>
${section({
  id: 'damage-relations',
  title: 'Damage relations',
  body: `<dl class="relations">${relations}</dl>`,
})}
${section({
  id: 'type-pokemon',
  title: 'Pokémon',
  body: `<p class="result-count">${cards.length} Pokémon</p>${cardGrid(cards)}`,
})}
${section({
  id: 'type-moves',
  title: 'Moves',
  body: `<p class="result-count">${moves.length} moves</p><ul class="link-grid">${moveLinks}</ul>`,
})}`;
}

const moveFact = (label, value, { html = false } = {}) =>
  `<div class="move-fact"><dt>${escapeHtml(label)}</dt><dd>${html ? value : escapeHtml(value)}</dd></div>`;

export function renderMovePage(move, speciesCatalog) {
  const name = englishName(move, move.name);
  const category = move.damage_class?.name ? humanize(move.damage_class.name) : '—';
  const typeName = move.type?.name;
  const effect = englishShortEffect(move) ?? latestEnglishFlavorText(move) ?? '—';

  const learnedBy = dedupeSortedPokemonEntries(
    (move.learned_by_pokemon ?? []).map((pokemon) => ({ pokemon })),
  );
  const cards = learnedBy
    .map((entry) => {
      const species = speciesCatalog.byId.get(entry.id);
      const fallbackName = entry.pokemon?.name;
      return species ? { id: entry.id, name: species.name } : fallbackName ? { id: entry.id, name: fallbackName } : null;
    })
    .filter(Boolean);

  return `<h1 class="page-title">${escapeHtml(name)}</h1>
<dl class="move-facts">
  ${moveFact('Type', typeName ? typeBadge(typeName, { link: true, label: humanize(typeName) }) : '—', { html: true })}
  ${moveFact('Category', category)}
  ${moveFact('Power', formatValue(move.power))}
  ${moveFact('Accuracy', formatValue(move.accuracy))}
  ${moveFact('PP', formatValue(move.pp))}
</dl>
${section({ id: 'effect', title: 'Effect', body: `<p>${escapeHtml(effect)}</p>` })}
${section({
  id: 'learned-by',
  title: 'Learned by',
  body: `<p class="result-count">${cards.length} Pokémon</p>${cardGrid(cards)}`,
})}`;
}

export function renderAbilityPage(ability, speciesCatalog) {
  const name = englishName(ability, ability.name);
  const effect = englishShortEffect(ability) ?? '—';

  const hiddenById = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (!Number.isFinite(id) || id > 10000) continue;
    hiddenById.set(id, Boolean(hiddenById.get(id) || entry.is_hidden));
  }

  const cards = [...hiddenById.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, hidden]) => {
      const species = speciesCatalog.byId.get(id);
      return species ? { id, name: species.name, hidden } : null;
    })
    .filter(Boolean);

  return `<h1 class="page-title">${escapeHtml(name)}</h1>
${section({ id: 'ability-effect', title: 'Effect', body: `<p>${escapeHtml(effect)}</p>` })}
${section({
  id: 'ability-pokemon',
  title: 'Pokémon',
  body: `<p class="result-count">${cards.length} Pokémon</p>${cardGrid(cards)}`,
})}`;
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function defaultCompare(a, b, methodName) {
  if (methodName === 'level-up') {
    const levelA = a.level ?? Number.POSITIVE_INFINITY;
    const levelB = b.level ?? Number.POSITIVE_INFINITY;
    if (levelA !== levelB) return levelA - levelB;
  }
  return a.moveDisplay.localeCompare(b.moveDisplay);
}

function sortRows(rows, methodName, sortKey, direction) {
  if (!sortKey) return [...rows].sort((a, b) => defaultCompare(a, b, methodName));

  return [...rows].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    const aMissing = valueIsMissing(aValue);
    const bMissing = valueIsMissing(bValue);
    if (aMissing && bMissing) return defaultCompare(a, b, methodName);
    if (aMissing) return 1;
    if (bMissing) return -1;

    let result;
    if (typeof aValue === 'number' && typeof bValue === 'number') result = aValue - bValue;
    else result = String(aValue).localeCompare(String(bValue), 'en', { numeric: true, sensitivity: 'base' });

    if (direction === 'descending') result = -result;
    return result || defaultCompare(a, b, methodName);
  });
}

function valueIsMissing(value) {
  return value === null || value === undefined || value === '';
}

function methodId(methodName) {
  return methodName.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function renderMoveTable({ speciesName, gameName, method, sortKey, direction }) {
  const hasLevel = method.name === 'level-up';
  const activeDirection = sortKey ? direction : null;
  const tableId = `move-table-${methodId(method.name)}`;
  const rows = sortRows(method.rows, method.name, sortKey, direction);

  const columns = [
    ...(hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];

  const headers = columns
    .map((column) => {
      const active = column.key === sortKey;
      const nextDirection = active
        ? activeDirection === 'ascending'
          ? 'descending'
          : 'ascending'
        : 'ascending';
      const href = `/pokemon/${encodeURIComponent(speciesName)}/move-table?game=${encodeURIComponent(
        gameName,
      )}&method=${encodeURIComponent(method.name)}&sort=${column.key}&dir=${nextDirection}`;
      return `<th scope="col"${active ? ` aria-sort="${activeDirection}"` : ''}><button type="button" class="sort-button" hx-get="${escapeHtml(
        href,
      )}" hx-target="#${tableId}" hx-swap="outerHTML">${column.label}</button></th>`;
    })
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = [
        ...(hasLevel ? [`<td>${row.level ?? '—'}</td>`] : []),
        `<td><a href="/moves/${encodeURIComponent(row.moveName)}">${escapeHtml(row.moveDisplay)}</a></td>`,
        `<td>${
          row.typeName
            ? typeBadge(row.typeName, { link: true, label: row.typeDisplay })
            : '—'
        }</td>`,
        `<td>${escapeHtml(row.category)}</td>`,
        `<td>${formatValue(row.power)}</td>`,
        `<td>${formatValue(row.accuracy)}</td>`,
        `<td>${formatValue(row.pp)}</td>`,
      ];
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  return `<table id="${tableId}" class="move-table">
  <caption>${escapeHtml(method.display)}</caption>
  <thead><tr>${headers}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>`;
}

function buildMoveTables(pokemon, selectedGame) {
  const rawRows = [];
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name !== selectedGame) continue;
      rawRows.push({
        moveName: moveEntry.move.name,
        methodName: detail.move_learn_method?.name ?? 'other',
        level: detail.level_learned_at ?? null,
      });
    }
  }

  return rawRows;
}

async function getMovesData(pokemon, requestedGame) {
  const versionGroupNames = new Set();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name) versionGroupNames.add(detail.version_group.name);
    }
  }

  const versionGroups = (
    await Promise.all(
      [...versionGroupNames].map(async (name) => {
        const data = await getVersionGroup(name);
        return { name, order: data?.order ?? 0, display: humanize(name) };
      }),
    )
  ).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const selected = versionGroups.find((group) => group.name === requestedGame) ?? versionGroups.at(-1) ?? null;
  if (!selected) return { versionGroups, selected: null, methods: [] };

  const rawRows = buildMoveTables(pokemon, selected.name);
  const moveNames = [...new Set(rawRows.map((row) => row.moveName))];
  const moveDetails = new Map(
    await Promise.all(
      moveNames.map(async (moveName) => {
        const move = await getMove(moveName);
        return [moveName, move];
      }),
    ),
  );

  const grouped = new Map();
  for (const raw of rawRows) {
    const move = moveDetails.get(raw.moveName);
    const row = {
      level: raw.level,
      moveName: raw.moveName,
      moveDisplay: move ? englishName(move, raw.moveName) : humanize(raw.moveName),
      typeName: move?.type?.name ?? null,
      typeDisplay: move?.type?.name ? humanize(move.type.name) : '—',
      category: move?.damage_class?.name ? humanize(move.damage_class.name) : '—',
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
    const rows = grouped.get(raw.methodName) ?? [];
    rows.push(row);
    grouped.set(raw.methodName, rows);
  }

  const methods = [...grouped.keys()]
    .sort((a, b) => {
      const aFixed = METHOD_ORDER.indexOf(a);
      const bFixed = METHOD_ORDER.indexOf(b);
      if (aFixed !== -1 || bFixed !== -1) {
        if (aFixed === -1) return 1;
        if (bFixed === -1) return -1;
        return aFixed - bFixed;
      }
      return humanize(a).localeCompare(humanize(b));
    })
    .map((name) => ({ name, display: humanize(name), rows: grouped.get(name) }));

  return { versionGroups, selected, methods };
}

export function renderMovesSection(speciesName, movesData) {
  const options = movesData.versionGroups
    .map(
      (group) =>
        `<option value="${escapeHtml(group.name)}"${group.name === movesData.selected?.name ? ' selected' : ''}>${escapeHtml(
          group.display,
        )}</option>`,
    )
    .join('');

  const tables = movesData.selected
    ? movesData.methods
        .map((method) =>
          renderMoveTable({
            speciesName,
            gameName: movesData.selected.name,
            method,
          }),
        )
        .join('')
    : '';

  return `<section id="moves" class="panel" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  <div class="game-control">
    <label for="game">Game</label>
    <select id="game" name="game"
            hx-get="/pokemon/${encodeURIComponent(speciesName)}"
            hx-trigger="change"
            hx-target="#moves"
            hx-swap="outerHTML"
            hx-include="this"
            hx-push-url="true">${options}</select>
  </div>
  ${movesData.selected ? `<div class="table-scroll">${tables}</div>` : ''}
</section>`;
}

export function evolutionTree(chainNode) {
  if (!chainNode?.species?.name) return '';
  const link = `<a href="/pokemon/${encodeURIComponent(chainNode.species.name)}">${escapeHtml(
    humanize(chainNode.species.name),
  )}</a>`;
  const children = (chainNode.evolves_to ?? []).map((child) => evolutionTree(child)).join('');
  return `<li>${link}${children ? `<ul>${children}</ul>` : ''}</li>`;
}

function renderStatsSection(pokemon) {
  const stats = pokemon.stats ?? [];
  const rows = stats
    .map((entry) => {
      const value = entry.base_stat ?? 0;
      const width = Math.min(100, Math.max(0, (value / 255) * 100));
      return `<tr>
  <th scope="row">${escapeHtml(statLabel(entry.stat?.name))}</th>
  <td>${value}</td>
  <td class="stat-bar-cell"><span class="stat-bar-track"><span class="stat-bar" style="width: ${width.toFixed(2)}%"></span></span></td>
</tr>`;
    })
    .join('');
  const total = stats.reduce((sum, entry) => sum + (entry.base_stat ?? 0), 0);

  return section({
    id: 'base-stats',
    title: 'Base stats',
    body: `<table class="stats-table">
  <caption class="visually-hidden">Base stats</caption>
  <tbody>
    ${rows}
    <tr class="stat-total"><th scope="row">Total</th><td>${total}</td><td class="stat-bar-cell"></td></tr>
  </tbody>
</table>`,
  });
}

export async function getPokemonPageData(name, requestedGame) {
  const species = await getSpecies(name);
  if (!species) return null;
  const [pokemon, evolutionChain, speciesCatalog] = await Promise.all([
    getDefaultPokemon(species),
    getEvolutionChain(species.evolution_chain?.url),
    getSpeciesCatalog(),
  ]);
  if (!pokemon) return null;

  const movesData = await getMovesData(pokemon, requestedGame);
  return { species, pokemon, evolutionChain, speciesCatalog, movesData };
}

export function renderPokemonPage(data) {
  const { species, pokemon, evolutionChain, movesData } = data;
  const name = englishName(species, species.name);
  const genus = englishGenus(species);
  const types = pokemonTypes(pokemon);
  const flavor = latestEnglishFlavorText(species);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    spriteUrl(species.id);

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => {
      if (!entry.ability?.name) return '';
      return `<li><a href="/abilities/${encodeURIComponent(entry.ability.name)}">${escapeHtml(
        humanize(entry.ability.name),
      )}</a>${entry.is_hidden ? ' <span class="hidden-label">(hidden)</span>' : ''}</li>`;
    })
    .join('');

  const root = evolutionChain?.chain ?? {
    species: { name: species.name },
    evolves_to: [],
  };

  return `<div class="pokemon-summary">
  <div class="artwork-card">
    <img class="artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(name)}">
  </div>
  <div class="summary-info">
    <p class="pokemon-dex-large">${formatDex(species.id)}</p>
    <h1 class="page-title">${escapeHtml(name)}</h1>
    ${genus ? `<p class="genus">${escapeHtml(genus)}</p>` : ''}
    <div class="summary-types">${typeBadges(types, { links: true })}</div>
    <dl class="facts">
      <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
      <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
    </dl>
    ${flavor ? `<p class="flavor-text">${escapeHtml(flavor)}</p>` : ''}
  </div>
</div>
${renderStatsSection(pokemon)}
${section({ id: 'abilities', title: 'Abilities', body: `<ul class="plain-list">${abilities}</ul>` })}
${section({ id: 'evolution', title: 'Evolution', body: `<ul class="evolution-list">${evolutionTree(root)}</ul>` })}
${renderMovesSection(species.name, movesData)}`;
}

export async function renderMovePageByName(name) {
  const [move, speciesCatalog] = await Promise.all([getMove(name), getSpeciesCatalog()]);
  if (!move) return null;
  return renderMovePage(move, speciesCatalog);
}

export async function renderAbilityPageByName(name) {
  const [ability, speciesCatalog] = await Promise.all([getAbility(name), getSpeciesCatalog()]);
  if (!ability) return null;
  return renderAbilityPage(ability, speciesCatalog);
}

export async function renderTypePageByName(name) {
  const [typeCatalog, speciesCatalog] = await Promise.all([getTypeCatalog(), getSpeciesCatalog()]);
  const type = typeCatalog.byName.get(name);
  if (!type) return null;
  return renderTypePage(type, speciesCatalog, typeCatalog);
}

export function wrapPage(heading, content) {
  return layout({ title: pageTitle(heading), content });
}

export function renderNotFound() {
  return layout({ title: pageTitle('Not found'), content: notFoundPage() });
}

export { PAGE_SIZE };
