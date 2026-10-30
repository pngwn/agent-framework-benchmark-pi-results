import {
  dash,
  englishGenus,
  englishName,
  formatDex,
  getEvolutionChain,
  getMove,
  getPokemonById,
  getSpecies,
  getVersionGroup,
  humanize,
  latestEnglishFlavor,
  typeLabelFromRef,
} from '../api.js';
import { el, heading, panel, typeBadge } from '../ui.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const MOVE_METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function latestFlavorText(species) {
  return latestEnglishFlavor(species) ?? '';
}

function statTable(pokemon) {
  const total = (pokemon.stats ?? []).reduce((sum, stat) => sum + (stat.base_stat ?? 0), 0);
  const rows = (pokemon.stats ?? []).map((stat) => {
    const label = STAT_LABELS[stat.stat?.name] ?? humanize(stat.stat?.name);
    const value = Number(stat.base_stat) || 0;
    const percent = Math.max(0, Math.min(100, (value / 255) * 100));
    return el(
      'tr',
      {},
      el('th', { scope: 'row', text: label }),
      el('td', { class: 'stat-number', text: String(value) }),
      el(
        'td',
        { class: 'stat-bar-cell' },
        el('span', {
          class: 'stat-bar',
          style: `width: ${percent}%;`,
          'aria-hidden': 'true',
        }),
      ),
    );
  });

  rows.push(
    el(
      'tr',
      { class: 'stat-total' },
      el('th', { scope: 'row', text: 'Total' }),
      el('td', { class: 'stat-number', text: String(total) }),
      el('td', { class: 'stat-bar-cell' }),
    ),
  );

  return el('table', { class: 'stats-table' }, el('tbody', {}, rows));
}

function evolutionTree(chain) {
  const buildNode = (node) => {
    const item = el(
      'li',
      {},
      el('a', {
        href: `/pokemon/${encodeURIComponent(node.species.name)}`,
        text: humanize(node.species.name),
      }),
    );
    if (node.evolves_to?.length) {
      item.append(el('ul', { class: 'evolution-list' }, node.evolves_to.map(buildNode)));
    }
    return item;
  };
  return el('ul', { class: 'evolution-list' }, buildNode(chain));
}

function collectGames(pokemon) {
  const games = new Map();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      const name = detail.version_group?.name;
      if (name) games.set(name, detail.version_group);
    }
  }
  return games;
}

async function loadGames(pokemon) {
  const games = [...collectGames(pokemon).keys()];
  const details = await Promise.all(games.map((name) => getVersionGroup(name)));
  return details.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function loadMoveRows(pokemon, gameName) {
  const entries = new Map();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group?.name !== gameName) continue;
      const method = detail.move_learn_method?.name;
      if (!method) continue;
      const key = `${method}|${move.move.name}`;
      const existing = entries.get(key);
      if (existing) {
        if (detail.level_learned_at !== undefined && detail.level_learned_at !== null) {
          existing.level = Math.min(existing.level ?? Infinity, detail.level_learned_at);
        }
        continue;
      }
      entries.set(key, {
        method,
        moveRef: move.move,
        level: detail.level_learned_at ?? 0,
      });
    }
  }

  const raw = [...entries.values()];
  const details = await Promise.all(raw.map((entry) => getMove(entry.moveRef.name)));
  return raw.map((entry, index) => {
    const move = details[index];
    return {
      method: entry.method,
      level: entry.level,
      move: englishName(move),
      moveSlug: move.name,
      type: typeLabelFromRef(move.type),
      typeSlug: move.type?.name ?? '',
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
  });
}

function methodRank(method) {
  const index = MOVE_METHOD_ORDER.indexOf(method);
  return index === -1 ? 100 : index;
}

function isMissing(value) {
  return value === null || value === undefined || value === '';
}

function defaultSort(rows, method) {
  return [...rows].sort((a, b) => {
    if (method === 'level-up') {
      const levelDiff = (a.level ?? 0) - (b.level ?? 0);
      if (levelDiff) return levelDiff;
    }
    return String(a.move).localeCompare(String(b.move));
  });
}

function compareRows(a, b, key, direction) {
  const left = a[key];
  const right = b[key];
  const leftMissing = isMissing(left);
  const rightMissing = isMissing(right);
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return String(a.move).localeCompare(String(b.move));
    return leftMissing ? 1 : -1;
  }
  let result;
  if (typeof left === 'number' && typeof right === 'number') result = left - right;
  else result = String(left).localeCompare(String(right));
  if (result === 0) result = String(a.move).localeCompare(String(b.move));
  return direction === 'descending' ? -result : result;
}

function moveCell(row, key) {
  if (key === 'level') return el('td', { text: String(row.level) });
  if (key === 'move') {
    return el(
      'td',
      {},
      el('a', {
        href: `/moves/${encodeURIComponent(row.moveSlug)}`,
        text: row.move,
      }),
    );
  }
  if (key === 'type') {
    return el(
      'td',
      {},
      row.typeSlug
        ? typeBadge(row.typeSlug, row.type)
        : el('span', { text: '—' }),
    );
  }
  if (key === 'category') return el('td', { text: dash(row.category) });
  if (key === 'power') return el('td', { text: dash(row.power) });
  if (key === 'accuracy') return el('td', { text: dash(row.accuracy) });
  return el('td', { text: dash(row.pp) });
}

function moveTable(method, rows) {
  const columns = [
    ...(method === 'level-up' ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];

  let sort = { key: null, direction: 'ascending' };
  let currentRows = defaultSort(rows, method);

  const table = el(
    'table',
    { class: 'moves-table' },
    el('caption', { text: humanize(method) }),
  );
  const headRow = el('tr');
  const headerCells = new Map();
  for (const column of columns) {
    const button = el('button', {
      type: 'button',
      class: 'sort-button',
      text: column.label,
    });
    const th = el('th', { scope: 'col', 'aria-sort': 'none' }, button);
    th.addEventListener('click', () => {
      const direction =
        sort.key === column.key
          ? sort.direction === 'ascending'
            ? 'descending'
            : 'ascending'
          : 'ascending';
      sort = { key: column.key, direction };
      currentRows = [...rows].sort((a, b) => compareRows(a, b, column.key, direction));
      renderBody();
      for (const [key, cell] of headerCells) {
        cell.setAttribute('aria-sort', key === column.key ? direction : 'none');
      }
    });
    headerCells.set(column.key, th);
    headRow.append(th);
  }
  table.append(el('thead', {}, headRow));
  const body = el('tbody');
  table.append(body);

  function renderBody() {
    body.replaceChildren(
      ...currentRows.map((row) =>
        el('tr', {}, columns.map((column) => moveCell(row, column.key))),
      ),
    );
  }

  renderBody();
  return table;
}

function movesTables(rows) {
  const methods = [...new Set(rows.map((row) => row.method))].sort(
    (a, b) => methodRank(a) - methodRank(b) || humanize(a).localeCompare(humanize(b)),
  );
  return methods.map((method) => moveTable(method, rows.filter((row) => row.method === method)));
}

function buildMovesSection(pokemon, games, selectedGame, initialRows) {
  const select = el(
    'select',
    { id: 'game-select' },
    games.map((game) =>
      el('option', {
        value: game.name,
        text: humanize(game.name),
        selected: game.name === selectedGame,
      }),
    ),
  );
  const tablesHost = el('div', { class: 'moves-tables' }, ...movesTables(initialRows));

  let requestNumber = 0;
  select.addEventListener('change', async () => {
    const game = select.value;
    const url = new URL(location.href);
    url.searchParams.set('game', game);
    history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);

    const request = ++requestNumber;
    tablesHost.replaceChildren(el('p', { class: 'loading-text', text: 'Loading moves…' }));
    try {
      const rows = await loadMoveRows(pokemon, game);
      if (request !== requestNumber || !tablesHost.isConnected) return;
      tablesHost.replaceChildren(...movesTables(rows));
    } catch {
      if (request === requestNumber) {
        tablesHost.replaceChildren(el('p', { class: 'loading-text', text: 'Could not load moves.' }));
      }
    }
  });

  return panel(
    2,
    'Moves',
    'moves',
    el(
      'div',
      { class: 'game-control' },
      el('label', { for: 'game-select', text: 'Game' }),
      select,
    ),
    tablesHost,
  );
}

export async function renderPokemon(_main, searchParams, isCurrent, name) {
  let species;
  try {
    species = await getSpecies(name);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }

  const [pokemon, evolution] = await Promise.all([
    getPokemonById(species.id),
    species.evolution_chain?.url
      ? getEvolutionChain(species.evolution_chain.url).catch(() => null)
      : Promise.resolve(null),
  ]);
  const games = await loadGames(pokemon);
  if (!isCurrent()) return null;

  const defaultGame = games.length ? games[games.length - 1].name : '';
  const requestedGame = searchParams.get('game');
  const selectedGame =
    requestedGame && games.some((game) => game.name === requestedGame)
      ? requestedGame
      : defaultGame;
  const initialRows = selectedGame ? await loadMoveRows(pokemon, selectedGame) : [];
  if (!isCurrent()) return null;

  const displayName = englishName(species);
  const flavor = latestFlavorText(species);
  const genus = englishGenus(species);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default;

  const types = (pokemon.types ?? [])
    .slice()
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => entry.type);

  const summary = el(
    'div',
    { class: 'pokemon-summary panel' },
    el(
      'div',
      { class: 'artwork-wrap' },
      artwork
        ? el('img', {
            class: 'artwork',
            src: artwork,
            alt: displayName,
          })
        : null,
    ),
    el(
      'div',
      { class: 'summary-content' },
      el('div', { class: 'dex-number', text: formatDex(species.id) }),
      heading(1, displayName),
      genus ? el('div', { class: 'genus', text: genus }) : null,
      el(
        'div',
        { class: 'type-list' },
        types.map((type) => typeBadge(type.name, typeLabelFromRef(type))),
      ),
      el(
        'dl',
        { class: 'physical-list' },
        el(
          'div',
          { class: 'physical-item' },
          el('dt', { text: 'Height' }),
          el('dd', { text: `${((pokemon.height ?? 0) / 10).toFixed(1)} m` }),
        ),
        el(
          'div',
          { class: 'physical-item' },
          el('dt', { text: 'Weight' }),
          el('dd', { text: `${((pokemon.weight ?? 0) / 10).toFixed(1)} kg` }),
        ),
      ),
      flavor ? el('p', { class: 'flavor-text', text: flavor }) : null,
    ),
  );

  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

  const abilitiesList = el(
    'ul',
    { class: 'plain-list' },
    abilities.map((entry) => {
      const item = el(
        'li',
        {},
        el('a', {
          href: `/abilities/${encodeURIComponent(entry.ability.name)}`,
          text: humanize(entry.ability.name),
        }),
      );
      if (entry.is_hidden) item.append(document.createTextNode(' (hidden)'));
      return item;
    }),
  );

  const content = el(
    'div',
    { class: 'pokemon-page' },
    summary,
    panel(2, 'Base stats', 'stats', statTable(pokemon)),
    panel(2, 'Abilities', 'abilities', abilitiesList),
    panel(
      2,
      'Evolution',
      'evolution',
      evolution?.chain ? evolutionTree(evolution.chain) : el('p', { text: '—' }),
    ),
    games.length ? buildMovesSection(pokemon, games, selectedGame, initialRows) : null,
  );

  return {
    title: `${displayName} – Pokédex`,
    content,
  };
}
