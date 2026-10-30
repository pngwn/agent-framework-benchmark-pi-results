import { api, mapLimit, mediaUrl, spriteUrl } from '../api.js';
import {
  displayValue,
  englishName,
  escapeHtml,
  humanize,
  latestEnglishFlavor,
  setDocumentTitle,
} from '../utils.js';
import { typeBadge } from '../components.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const FIXED_METHODS = ['level-up', 'machine', 'egg', 'tutor'];
const NUMERIC_COLUMNS = new Set(['level', 'power', 'accuracy', 'pp']);

function methodOrder(methods) {
  return [...methods].sort((a, b) => {
    const ai = FIXED_METHODS.indexOf(a);
    const bi = FIXED_METHODS.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return humanize(a).localeCompare(humanize(b));
  });
}

function artworkUrl(pokemon) {
  const sprites = pokemon.sprites ?? {};
  return sprites.other?.['official-artwork']?.front_default
    ?? sprites.other?.home?.front_default
    ?? sprites.other?.['dream-world']?.front_default
    ?? sprites.front_default
    ?? spriteUrl(pokemon.id);
}

function renderEvolutionNode(node) {
  const name = node.species?.name;
  if (!name) return '';
  const children = node.evolves_to ?? [];
  const nested = children.length
    ? `<ul class="evolution-list">${children.map((child) => renderEvolutionNode(child)).join('')}</ul>`
    : '';

  return `<li><a href="/pokemon/${encodeURIComponent(name)}">${escapeHtml(humanize(name))}</a>${nested}</li>`;
}

function renderEvolution(evolutionChain) {
  const root = evolutionChain?.chain;
  if (!root) return '';
  return `<ul class="evolution-list">${renderEvolutionNode(root)}</ul>`;
}

async function loadVersionGroups(moves) {
  const names = new Set();
  for (const move of moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group?.name) names.add(detail.version_group.name);
    }
  }

  const groups = await Promise.all([...names].map((name) => api(`version-group/${name}`)));
  return groups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function loadMoveRows(pokemon, gameName) {
  const occurrences = [];

  for (const entry of pokemon.moves ?? []) {
    for (const detail of entry.version_group_details ?? []) {
      if (detail.version_group?.name !== gameName) continue;
      occurrences.push({
        method: detail.move_learn_method?.name ?? 'other',
        level: detail.level_learned_at ?? 0,
        moveName: entry.move.name,
      });
    }
  }

  const names = [...new Set(occurrences.map((entry) => entry.moveName))];
  const moveDetails = await mapLimit(names, 12, async (moveName) => {
    try {
      return await api(`move/${moveName}`);
    } catch {
      return null;
    }
  });
  const detailsByName = new Map(names.map((name, index) => [name, moveDetails[index]]));

  const byMethod = new Map();
  for (const occurrence of occurrences) {
    const detail = detailsByName.get(occurrence.moveName);
    const typeName = detail?.type?.name ?? '';
    const row = {
      level: occurrence.level,
      moveName: occurrence.moveName,
      moveLabel: detail ? englishName(detail, humanize(occurrence.moveName)) : humanize(occurrence.moveName),
      typeName,
      typeLabel: typeName ? humanize(typeName) : '—',
      category: detail?.damage_class?.name ? humanize(detail.damage_class.name) : '—',
      power: detail?.power,
      accuracy: detail?.accuracy,
      pp: detail?.pp,
    };
    const rows = byMethod.get(occurrence.method) ?? [];
    rows.push(row);
    byMethod.set(occurrence.method, rows);
  }

  return byMethod;
}

function isMissing(value) {
  return value === null || value === undefined || value === '' || value === '—';
}

function columnsFor(method) {
  return [
    ...(method === 'level-up' ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'moveLabel', label: 'Move' },
    { key: 'typeLabel', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];
}

function sortRows(rows, method, sort) {
  const sorted = [...rows];

  if (!sort) {
    if (method === 'level-up') {
      sorted.sort((a, b) => {
        const aMissing = isMissing(a.level);
        const bMissing = isMissing(b.level);
        if (aMissing && bMissing) return a.moveLabel.localeCompare(b.moveLabel);
        if (aMissing) return 1;
        if (bMissing) return -1;
        return (Number(a.level) - Number(b.level)) || a.moveLabel.localeCompare(b.moveLabel);
      });
    } else {
      sorted.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
    }
    return sorted;
  }

  sorted.sort((a, b) => {
    const aMissing = isMissing(a[sort.key]);
    const bMissing = isMissing(b[sort.key]);

    if (aMissing || bMissing) {
      if (aMissing && bMissing) return a.moveLabel.localeCompare(b.moveLabel);
      return aMissing ? 1 : -1;
    }

    let comparison;
    if (NUMERIC_COLUMNS.has(sort.key)) {
      comparison = Number(a[sort.key]) - Number(b[sort.key]);
    } else {
      comparison = String(a[sort.key]).localeCompare(String(b[sort.key]));
    }

    if (comparison === 0) comparison = a.moveLabel.localeCompare(b.moveLabel);
    return sort.dir === 'ascending' ? comparison : -comparison;
  });

  return sorted;
}

function renderMoveTable(method, rows, sort) {
  const columns = columnsFor(method);
  const sortedRows = sortRows(rows, method, sort);

  const headers = columns.map((column) => {
    const aria = sort?.key === column.key ? ` aria-sort="${sort.dir}"` : '';
    return `<th scope="col"${aria}><button type="button" data-key="${column.key}">${column.label}</button></th>`;
  }).join('');

  const body = sortedRows.map((row) => {
    const cells = columns.map((column) => {
      if (column.key === 'moveLabel') {
        return `<td><a href="/moves/${encodeURIComponent(row.moveName)}">${escapeHtml(row.moveLabel)}</a></td>`;
      }
      if (column.key === 'typeLabel') {
        return `<td>${row.typeName ? typeBadge(row.typeName, { label: row.typeLabel, href: `/types/${row.typeName}` }) : '—'}</td>`;
      }
      if (column.key === 'level') {
        return `<td>${displayValue(row.level)}</td>`;
      }
      if (column.key === 'category') {
        return `<td>${escapeHtml(row.category)}</td>`;
      }
      return `<td>${displayValue(row[column.key])}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<div class="table-wrap">
    <table data-method="${escapeHtml(method)}">
      <caption>${escapeHtml(humanize(method))}</caption>
      <thead><tr>${headers}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

export async function renderPokemonPage(main, slug) {
  const species = await api(`pokemon-species/${encodeURIComponent(slug)}`);
  const variety = species.varieties?.find((entry) => entry.is_default) ?? species.varieties?.[0];
  if (!variety?.pokemon) throw new Error('Species has no default Pokémon');

  const [pokemon, evolutionChain] = await Promise.all([
    api(variety.pokemon.url),
    species.evolution_chain?.url ? api(species.evolution_chain.url) : Promise.resolve(null),
  ]);

  const heading = englishName(species, humanize(species.name));
  const genus = species.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? '—';
  const flavor = latestEnglishFlavor(species.flavor_text_entries) || '—';
  const types = [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot);

  const games = await loadVersionGroups(pokemon.moves);
  const params = new URLSearchParams(location.search);
  const requestedGame = params.get('game');
  const selectedGame = games.find((game) => game.name === requestedGame) ?? games.at(-1) ?? null;
  const rowsByMethod = selectedGame ? await loadMoveRows(pokemon, selectedGame.name) : new Map();
  const orderedMethods = methodOrder([...rowsByMethod.keys()]);
  const sortState = {};

  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, stat) => sum + Number(stat.base_stat ?? 0), 0);
  const statRows = stats.map((stat) => {
    const value = Number(stat.base_stat ?? 0);
    const label = STAT_LABELS[stat.stat?.name] ?? humanize(stat.stat?.name);
    const width = Math.max(0, Math.min(100, (value / 255) * 100));
    return `<tr>
      <th scope="row">${escapeHtml(label)}</th>
      <td><span class="stat-value">${value}</span><span class="stat-bar" aria-hidden="true"><span class="stat-fill" style="width:${width.toFixed(1)}%"></span></span></td>
    </tr>`;
  }).join('');

  const abilityItems = [...(pokemon.abilities ?? [])]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => {
      const abilityName = entry.ability?.name;
      if (!abilityName) return '';
      return `<li><a href="/abilities/${encodeURIComponent(abilityName)}">${escapeHtml(humanize(abilityName))}</a>${entry.is_hidden ? ' (hidden)' : ''}</li>`;
    })
    .join('');

  main.innerHTML = `
    <div class="pokemon-summary">
      <div class="pokemon-artwork">
        <img src="${escapeHtml(mediaUrl(artworkUrl(pokemon)))}" alt="${escapeHtml(heading)}">
      </div>
      <div class="pokemon-summary-text">
        <p class="dex">#${String(species.id).padStart(4, '0')}</p>
        <h1>${escapeHtml(heading)}</h1>
        <p class="genus">${escapeHtml(genus)}</p>
        <div class="pokemon-types">${types.map((entry) => typeBadge(entry.type.name, { href: `/types/${entry.type.name}` })).join('')}</div>
        <dl class="measurements">
          <div><dt>Height</dt><dd>${(Number(pokemon.height ?? 0) / 10).toFixed(1)} m</dd></div>
          <div><dt>Weight</dt><dd>${(Number(pokemon.weight ?? 0) / 10).toFixed(1)} kg</dd></div>
        </dl>
        <p class="flavor">${escapeHtml(flavor)}</p>
      </div>
    </div>

    <section class="panel" aria-labelledby="stats-heading">
      <h2 id="stats-heading">Base stats</h2>
      <table class="stats-table">
        <tbody>
          ${statRows}
          <tr><th scope="row">Total</th><td><span class="stat-value">${total}</span></td></tr>
        </tbody>
      </table>
    </section>

    <section class="panel" aria-labelledby="abilities-heading">
      <h2 id="abilities-heading">Abilities</h2>
      <ul class="plain-list">${abilityItems}</ul>
    </section>

    <section class="panel" aria-labelledby="evolution-heading">
      <h2 id="evolution-heading">Evolution</h2>
      ${renderEvolution(evolutionChain)}
    </section>

    <section class="panel moves-panel" id="moves" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div class="moves-control">
        <label for="game-select">Game</label>
        <select id="game-select" name="game">
          ${games.map((game) => `<option value="${escapeHtml(game.name)}"${selectedGame?.name === game.name ? ' selected' : ''}>${escapeHtml(humanize(game.name))}</option>`).join('')}
        </select>
      </div>
      <div id="moves-tables"></div>
    </section>
  `;

  const tablesEl = main.querySelector('#moves-tables');

  function mountTables() {
    tablesEl.innerHTML = orderedMethods
      .map((method) => renderMoveTable(method, rowsByMethod.get(method), sortState[method]))
      .join('');

    for (const button of tablesEl.querySelectorAll('th button')) {
      button.addEventListener('click', () => {
        const table = button.closest('table');
        const method = table?.dataset.method;
        if (!method) return;
        const key = button.dataset.key;
        const current = sortState[method];
        sortState[method] = {
          key,
          dir: current?.key === key && current.dir === 'ascending' ? 'descending' : 'ascending',
        };
        mountTables();
      });
    }
  }

  mountTables();

  main.querySelector('#game-select')?.addEventListener('change', (event) => {
    const url = new URL(location.href);
    url.searchParams.set('game', event.target.value);
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    renderPokemonPage(main, slug).catch((error) => {
      console.error(error);
    });
  });

  setDocumentTitle(heading);

  if (location.hash === '#moves') {
    requestAnimationFrame(() => {
      document.getElementById('moves')?.scrollIntoView({ block: 'start' });
    });
  }
}
