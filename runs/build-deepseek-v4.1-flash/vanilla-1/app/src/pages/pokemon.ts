import {
  apiFetch,
  displayNumber,
  englishName,
  formatDex,
  humanize,
  latestEnglishFlavor,
  type EvolutionChainRecord,
  type EvolutionNode,
  type PokemonRecord,
  type SpeciesRecord,
  type VersionGroupRecord,
} from '../api';
import {
  abilityHref,
  escapeHtml,
  moveHref,
  typeBadge,
} from '../components';

interface MoveRow {
  level: number | null;
  moveName: string;
  name: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveTable {
  method: string;
  label: string;
  rows: MoveRow[];
}

interface SortState {
  key: string;
  direction: 'ascending' | 'descending';
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function methodRank(method: string): number {
  const index = METHOD_ORDER.indexOf(method);
  return index === -1 ? METHOD_ORDER.length : index;
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function sortRows(rows: MoveRow[], method: string, sort: SortState | undefined): MoveRow[] {
  const result = [...rows];
  const value = (row: MoveRow, key: string): string | number | null => {
    switch (key) {
      case 'level':
        return row.level;
      case 'move':
        return row.name;
      case 'type':
        return row.typeLabel;
      case 'category':
        return row.category;
      case 'power':
        return row.power;
      case 'accuracy':
        return row.accuracy;
      case 'pp':
        return row.pp;
      default:
        return null;
    }
  };

  if (!sort) {
    result.sort((a, b) => {
      if (method === 'level-up') {
        const levelDifference = (a.level ?? Number.POSITIVE_INFINITY) - (b.level ?? Number.POSITIVE_INFINITY);
        if (levelDifference !== 0) return levelDifference;
      }
      return a.name.localeCompare(b.name);
    });
    return result;
  }

  result.sort((a, b) => {
    const aValue = value(a, sort.key);
    const bValue = value(b, sort.key);
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    const comparison = compareValues(aValue, bValue);
    return sort.direction === 'ascending' ? comparison : -comparison;
  });
  return result;
}

function renderEvolutionNode(node: EvolutionNode): string {
  const children = node.evolves_to ?? [];
  return `<li>
    <a href="/pokemon/${encodeURIComponent(node.species.name)}">${escapeHtml(humanize(node.species.name))}</a>
    ${children.length ? `<ul>${children.map(renderEvolutionNode).join('')}</ul>` : ''}
  </li>`;
}

async function loadMoveTables(pokemon: PokemonRecord, game: string): Promise<MoveTable[]> {
  const methods = new Map<string, { moveName: string; level: number | null }[]>();
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== game) continue;
      const method = detail.move_learn_method.name;
      const entries = methods.get(method) ?? [];
      entries.push({ moveName: move.move.name, level: detail.level_learned_at ?? null });
      methods.set(method, entries);
    }
  }

  const moveRefs = new Map<string, string>();
  for (const move of pokemon.moves) moveRefs.set(move.move.name, move.move.url);

  const needed = new Set<string>();
  for (const entries of methods.values()) {
    for (const entry of entries) needed.add(entry.moveName);
  }

  const records = await Promise.all(
    [...needed].map(async (name) => {
      const url = moveRefs.get(name);
      if (!url) return null;
      try {
        return await apiFetch<any>(url);
      } catch {
        return null;
      }
    }),
  );
  const recordsByName = new Map(records.filter(Boolean).map((record: any) => [record.name, record]));

  const tables: MoveTable[] = [];
  for (const [method, entries] of methods) {
    const rows: MoveRow[] = [];
    for (const entry of entries) {
      const record = recordsByName.get(entry.moveName);
      if (!record) continue;
      rows.push({
        level: entry.level,
        moveName: record.name,
        name: englishName(record.names, record.name),
        typeName: record.type?.name ?? 'unknown',
        typeLabel: humanize(record.type?.name ?? 'unknown'),
        category: humanize(record.damage_class?.name ?? 'unknown'),
        power: record.power ?? null,
        accuracy: record.accuracy ?? null,
        pp: record.pp ?? null,
      });
    }
    if (rows.length) tables.push({ method, label: humanize(method), rows });
  }

  tables.sort((a, b) => {
    const rankDifference = methodRank(a.method) - methodRank(b.method);
    if (rankDifference !== 0) return rankDifference;
    if (methodRank(a.method) === METHOD_ORDER.length) return a.method.localeCompare(b.method);
    return 0;
  });
  return tables;
}

function renderMovesContent(
  container: HTMLElement,
  tables: MoveTable[],
  sortStates: Record<string, SortState>,
): void {
  container.innerHTML = tables
    .map((table) => {
      const sort = sortStates[table.method];
      const columns =
        table.method === 'level-up'
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
      const rows = sortRows(table.rows, table.method, sort);
      const headers = columns
        .map(([key, label]) => {
          const ariaSort = sort?.key === key ? ` aria-sort="${sort.direction}"` : '';
          return `<th scope="col" data-method="${escapeHtml(table.method)}" data-key="${key}"${ariaSort}><button type="button" data-method="${escapeHtml(table.method)}" data-key="${key}">${label}</button></th>`;
        })
        .join('');
      const body = rows
        .map((row) => {
          const levelCell = table.method === 'level-up' ? `<td>${displayNumber(row.level)}</td>` : '';
          return `<tr>
            ${levelCell}
            <td><a href="${moveHref(row.moveName)}">${escapeHtml(row.name)}</a></td>
            <td>${typeBadge(row.typeName, row.typeLabel, true)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${displayNumber(row.power)}</td>
            <td>${displayNumber(row.accuracy)}</td>
            <td>${displayNumber(row.pp)}</td>
          </tr>`;
        })
        .join('');
      return `<div class="table-scroll">
        <table class="moves-table">
          <caption>${escapeHtml(table.label)}</caption>
          <thead><tr>${headers}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
    })
    .join('');
}

export async function renderPokemonPage(
  main: HTMLElement,
  url: URL,
  name: string,
  isActive: () => boolean,
): Promise<void> {
  const species = await apiFetch<SpeciesRecord>(`pokemon-species/${encodeURIComponent(name)}`);
  if (!isActive()) return;

  const defaultVariety = species.varieties?.find((variety) => variety.is_default) ?? species.varieties?.[0];
  const pokemonPromise = defaultVariety
    ? apiFetch<PokemonRecord>(defaultVariety.pokemon.url)
    : apiFetch<PokemonRecord>(`pokemon/${species.id}`);
  const evolutionPromise = species.evolution_chain
    ? apiFetch<EvolutionChainRecord>(species.evolution_chain.url)
    : Promise.resolve(null);
  const [pokemon, evolution] = await Promise.all([pokemonPromise, evolutionPromise]);
  if (!isActive()) return;

  const games = await getGames(pokemon);
  if (!isActive()) return;

  const requestedGame = url.searchParams.get('game') ?? '';
  const selectedGame = games.some((game) => game.name === requestedGame)
    ? requestedGame
    : games[games.length - 1]?.name ?? '';
  let tables = selectedGame ? await loadMoveTables(pokemon, selectedGame) : [];
  if (!isActive()) return;

  const displayName = englishName(species.names, species.name);
  const genus = species.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? '';
  const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? '';
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.other?.home?.front_default ??
    pokemon.sprites?.front_default ??
    '';
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot);
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  const totalStats = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);

  const statsRows = pokemon.stats
    .map((entry) => {
      const label = STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name);
      const width = Math.min(100, (entry.base_stat / 255) * 100);
      return `<tr>
        <th scope="row">${escapeHtml(label)}</th>
        <td><span class="stat-cell"><span class="stat-number">${entry.base_stat}</span><span class="stat-track" aria-hidden="true"><span class="stat-fill" style="width:${width}%"></span></span></span></td>
      </tr>`;
    })
    .join('');

  const abilityItems = abilities
    .map(
      (entry) => `<li><a href="${abilityHref(entry.ability.name)}">${escapeHtml(humanize(entry.ability.name))}</a>${entry.is_hidden ? ' (hidden)' : ''}</li>`,
    )
    .join('');

  const evolutionList = evolution?.chain ? `<ul class="evolution-list">${renderEvolutionNode(evolution.chain)}</ul>` : '';
  const gameOptions = games
    .map(
      (game) =>
        `<option value="${escapeHtml(game.name)}"${game.name === selectedGame ? ' selected' : ''}>${escapeHtml(humanize(game.name))}</option>`,
    )
    .join('');

  main.innerHTML = `
    <div class="page pokemon-page">
      <div class="panel pokemon-summary">
        <div class="artwork-wrap">
          ${artwork ? `<img class="artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(displayName)}">` : ''}
        </div>
        <div class="summary-info">
          <p class="dex">${formatDex(species.id)}</p>
          <h1>${escapeHtml(displayName)}</h1>
          <p class="genus">${escapeHtml(genus)}</p>
          <div class="type-row">${types.map((entry) => typeBadge(entry.type.name, humanize(entry.type.name), true)).join('')}</div>
          <dl class="measurements">
            <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
            <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
          </dl>
          ${flavor ? `<p class="flavor-text">${escapeHtml(flavor)}</p>` : ''}
        </div>
      </div>

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            ${statsRows}
            <tr class="total-row"><th scope="row">Total</th><td><span class="stat-number">${totalStats}</span></td></tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">${abilityItems}</ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        ${evolutionList}
      </section>

      <section class="panel moves-section" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="game-field field">
          <label for="game-select">Game</label>
          <select id="game-select">${gameOptions}</select>
        </div>
        <div id="moves-content"></div>
      </section>
    </div>`;

  document.title = `${displayName} – Pokédex`;

  const movesContent = main.querySelector<HTMLElement>('#moves-content');
  const gameSelect = main.querySelector<HTMLSelectElement>('#game-select');
  const movesSection = main.querySelector<HTMLElement>('#moves');
  if (!movesContent || !gameSelect || !movesSection) return;

  const sortStates: Record<string, SortState> = {};
  renderMovesContent(movesContent, tables, sortStates);

  movesSection.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const control = target?.closest<HTMLElement>('[data-key]');
    if (!control) return;
    const method = control.dataset.method;
    const key = control.dataset.key;
    if (!method || !key) return;
    const current = sortStates[method];
    sortStates[method] =
      current?.key === key
        ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
        : { key, direction: 'ascending' };
    renderMovesContent(movesContent, tables, sortStates);
  });

  let gameRequest = 0;
  gameSelect.addEventListener('change', async () => {
    const game = gameSelect.value;
    const request = ++gameRequest;
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('game', game);
    history.pushState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    movesContent.innerHTML = '<p class="loading">Loading…</p>';
    const nextTables = await loadMoveTables(pokemon, game);
    if (!isActive() || request !== gameRequest) return;
    tables = nextTables;
    for (const key of Object.keys(sortStates)) delete sortStates[key];
    renderMovesContent(movesContent, tables, sortStates);
  });

  const hash = location.hash.slice(1);
  if (hash) {
    requestAnimationFrame(() => {
      if (isActive()) document.getElementById(hash)?.scrollIntoView();
    });
  }
}

async function getGames(pokemon: PokemonRecord): Promise<VersionGroupRecord[]> {
  const refs = new Map<string, { name: string; url: string }>();
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details ?? []) {
      refs.set(detail.version_group.name, detail.version_group);
    }
  }
  const records = await Promise.all(
    [...refs.values()].map((ref) => apiFetch<VersionGroupRecord>(ref.url)),
  );
  return records.sort((a, b) => a.order - b.order);
}
