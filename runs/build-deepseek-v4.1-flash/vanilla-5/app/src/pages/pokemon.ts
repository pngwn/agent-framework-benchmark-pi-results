import { fetchRecord, mapLimit, type ApiRecord } from '../api';
import { parseIdFromRef } from '../data';
import { typeBadgeLink } from '../cards';
import { h, section } from '../dom';
import {
  dexNumber,
  displayNumber,
  englishGenus,
  englishName,
  humanize,
  kilogramsFromHectograms,
  latestEnglishFlavor,
  mediaUrl,
  metresFromDecimetres,
  moveMethodOrder,
  statLabel,
} from '../format';
import type { PageContext } from '../types';

interface PokemonMoveRow {
  moveName: string;
  englishMoveName: string;
  typeName: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  level: number | null;
  method: string;
}

type SortDirection = 'ascending' | 'descending';

interface SortState {
  key: string;
  direction: SortDirection;
}

const NUMERIC_KEYS = new Set(['level', 'power', 'accuracy', 'pp']);

export async function renderPokemon(ctx: PageContext, name: string): Promise<void> {
  const species = await fetchRecord(`pokemon-species/${encodeURIComponent(name)}`);
  if (!ctx.isCurrent()) return;

  const defaultVariety = (species.varieties ?? []).find((variety: ApiRecord) => variety.is_default)
    ?? species.varieties?.[0];
  const pokemonId = parseIdFromRef(defaultVariety?.pokemon) ?? Number(species.id);
  const evolutionUrl = species.evolution_chain?.url;

  const [pokemon, evolution] = await Promise.all([
    fetchRecord(`pokemon/${pokemonId}`),
    evolutionUrl ? fetchRecord(evolutionUrl) : Promise.resolve(null),
  ]);
  if (!ctx.isCurrent()) return;

  const titleName = englishName(species, species.name);
  ctx.setTitle(`${titleName} – Pokédex`);

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default
    ?? pokemon.sprites?.front_default
    ?? '';

  const sortedTypes = [...(pokemon.types ?? [])].sort(
    (a: ApiRecord, b: ApiRecord) => Number(a.slot) - Number(b.slot),
  );

  const summary = h(
    'div',
    { class: 'pokemon-summary' },
    h(
      'div',
      { class: 'artwork-wrap' },
      h('img', { class: 'artwork', src: mediaUrl(artwork), alt: titleName }),
    ),
    h(
      'div',
      { class: 'summary-info' },
      h('p', { class: 'dex-number' }, dexNumber(Number(species.id))),
      h('h1', {}, titleName),
      h('p', { class: 'genus' }, englishGenus(species)),
      h(
        'div',
        { class: 'summary-types' },
        ...sortedTypes.map((entry: ApiRecord) => typeBadgeLink(String(entry.type.name))),
      ),
      h(
        'dl',
        { class: 'facts' },
        h('div', {}, h('dt', {}, 'Height'), h('dd', {}, metresFromDecimetres(pokemon.height))),
        h('div', {}, h('dt', {}, 'Weight'), h('dd', {}, kilogramsFromHectograms(pokemon.weight))),
      ),
      h('p', { class: 'flavor-text' }, latestEnglishFlavor(species.flavor_text_entries)),
    ),
  );

  const statsSection = buildStatsSection(pokemon);
  const abilitiesSection = buildAbilitiesSection(pokemon);
  const evolutionSection = section(
    'evolution-section',
    'Evolution',
    evolution ? buildEvolutionList(evolution.chain) : '',
  );

  const movesSection = buildMovesSection(pokemon);

  ctx.main.replaceChildren(
    h(
      'div',
      { class: 'container page' },
      summary,
      h('div', { class: 'detail-sections' }, statsSection, abilitiesSection, evolutionSection),
      movesSection,
    ),
  );

  await finishMoves(ctx, movesSection);
}

function buildStatsSection(pokemon: ApiRecord): HTMLElement {
  const stats = Array.isArray(pokemon.stats) ? pokemon.stats : [];
  const rows = stats.map((entry: ApiRecord) => {
    const value = Number(entry.base_stat);
    return h(
      'tr',
      {},
      h('th', { scope: 'row' }, statLabel(String(entry.stat.name))),
      h('td', { class: 'stat-value' }, displayNumber(value)),
      h(
        'td',
        { class: 'stat-bar-cell' },
        h(
          'span',
          { class: 'stat-track' },
          h('span', {
            class: 'stat-fill',
            style: `width: ${Math.max(0, Math.min(100, (value / 255) * 100))}%`,
          }),
        ),
      ),
    );
  });
  const total = stats.reduce((sum: number, entry: ApiRecord) => sum + Number(entry.base_stat), 0);
  rows.push(
    h(
      'tr',
      { class: 'total-row' },
      h('th', { scope: 'row' }, 'Total'),
      h('td', { class: 'stat-value' }, displayNumber(total)),
      h('td', { class: 'stat-bar-cell' }),
    ),
  );
  return section('stats-section', 'Base stats', h('table', { class: 'stats-table' }, h('tbody', {}, ...rows)));
}

function buildAbilitiesSection(pokemon: ApiRecord): HTMLElement {
  const abilities = [...(pokemon.abilities ?? [])].sort(
    (a: ApiRecord, b: ApiRecord) => Number(a.slot) - Number(b.slot),
  );
  return section(
    'abilities-section',
    'Abilities',
    h(
      'ul',
      { class: 'plain-list' },
      ...abilities.map((entry: ApiRecord) =>
        h(
          'li',
          {},
          h('a', { href: `/abilities/${encodeURIComponent(entry.ability.name)}` }, humanize(entry.ability.name)),
          entry.is_hidden ? ' (hidden)' : '',
        ),
      ),
    ),
  );
}

function buildEvolutionList(chain: ApiRecord): HTMLUListElement {
  return h('ul', { class: 'evolution-list' }, evolutionItem(evolutionRoot(chain)));
}

function evolutionRoot(chain: ApiRecord): ApiRecord {
  return chain;
}

function evolutionItem(node: ApiRecord): HTMLLIElement {
  const item = h(
    'li',
    {},
    h('a', { href: `/pokemon/${encodeURIComponent(node.species.name)}` }, humanize(node.species.name)),
  );
  const children = node.evolves_to ?? [];
  if (children.length) {
    item.appendChild(h('ul', { class: 'evolution-list' }, ...children.map(evolutionItem)));
  }
  return item;
}

interface MovesView {
  section: HTMLElement;
  content: HTMLElement;
  gameSelect: HTMLSelectElement;
  groups: ApiRecord[];
  moves: ApiRecord[];
}

function buildMovesSection(pokemon: ApiRecord): HTMLElement {
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves : [];
  const groupNames = new Set<string>();
  for (const move of moves) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group?.name) groupNames.add(String(detail.version_group.name));
    }
  }

  const gameSelect = h('select', { id: 'game-select', name: 'game' });
  const content = h('div', { class: 'moves-content' });
  const sectionEl = section(
    'moves',
    'Moves',
    h(
      'div',
      { class: 'game-picker' },
      h('label', { for: 'game-select' }, 'Game'),
      gameSelect,
    ),
    content,
  );
  (sectionEl as HTMLElement & { __movesView?: MovesView }).__movesView = {
    section: sectionEl,
    content,
    gameSelect,
    groups: [],
    moves,
  };
  const view = (sectionEl as HTMLElement & { __movesView?: MovesView }).__movesView;
  if (view) view.moves = moves;
  return sectionEl;
}

async function finishMoves(ctx: PageContext, movesSection: HTMLElement): Promise<void> {
  const view = (movesSection as HTMLElement & { __movesView?: MovesView }).__movesView;
  if (!view) return;

  const { moves, gameSelect, content } = view;
  const groupNames = new Set<string>();
  for (const move of moves) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group?.name) groupNames.add(String(detail.version_group.name));
    }
  }

  const groups = await mapLimit([...groupNames], 8, (groupName) =>
    fetchRecord(`version-group/${encodeURIComponent(groupName)}`),
  );
  if (!ctx.isCurrent()) return;
  groups.sort((a, b) => Number(a.order) - Number(b.order));
  view.groups = groups;

  const requested = ctx.params.get('game');
  let selectedGame =
    groups.find((group) => group.name === requested)?.name
    ?? (groups.length ? String(groups[groups.length - 1].name) : '');

  const moveByName = new Map<string, ApiRecord>();
  const rowsByMethod = new Map<string, PokemonMoveRow[]>();
  const sortStates = new Map<string, SortState | null>();
  let tableVersion = 0;

  const movesInGame = (gameName: string): string[] => {
    const names = new Set<string>();
    for (const move of moves) {
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group?.name === gameName) names.add(String(move.move.name));
      }
    }
    return [...names];
  };

  const buildRows = (): Map<string, PokemonMoveRow[]> => {
    const rows = new Map<string, PokemonMoveRow[]>();
    for (const move of moves) {
      const details = (move.version_group_details ?? []).filter(
        (detail: ApiRecord) => detail.version_group?.name === selectedGame,
      );
      if (!details.length) continue;
      const detail = details[0];
      const method = String(detail.move_learn_method.name);
      const existingRows = rows.get(method) ?? [];
      if (existingRows.some((existing) => existing.moveName === String(move.move.name))) continue;
      const data = moveByName.get(String(move.move.name));
      if (!data) continue;
      existingRows.push({
        moveName: String(move.move.name),
        englishMoveName: englishName(data, String(move.move.name)),
        typeName: data.type?.name ? String(data.type.name) : '',
        category: data.damage_class?.name ? humanize(String(data.damage_class.name)) : '—',
        power: data.power ?? null,
        accuracy: data.accuracy ?? null,
        pp: data.pp ?? null,
        level:
          detail.level_learned_at === null || detail.level_learned_at === undefined
            ? null
            : Number(detail.level_learned_at),
        method,
      });
      rows.set(method, existingRows);
    }
    return rows;
  };

  const defaultSort = (method: string, rows: PokemonMoveRow[]): PokemonMoveRow[] =>
    [...rows].sort((a, b) => {
      if (method === 'level-up') {
        const levelDiff =
          (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER);
        if (levelDiff !== 0) return levelDiff;
      }
      return a.englishMoveName.localeCompare(b.englishMoveName);
    });

  const valueFor = (row: PokemonMoveRow, key: string): string | number | null => {
    switch (key) {
      case 'level':
        return row.level;
      case 'name':
        return row.englishMoveName;
      case 'typeName':
        return row.typeName;
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

  const sortedRows = (
    method: string,
    rows: PokemonMoveRow[],
    sort: SortState | null,
  ): PokemonMoveRow[] => {
    if (!sort) return defaultSort(method, rows);
    return [...rows].sort((a, b) => {
      const aValue = valueFor(a, sort.key);
      const bValue = valueFor(b, sort.key);
      const aMissing = aValue === null || aValue === undefined || aValue === '—' || aValue === '';
      const bMissing = bValue === null || bValue === undefined || bValue === '—' || bValue === '';
      if (aMissing && bMissing) return a.englishMoveName.localeCompare(b.englishMoveName);
      if (aMissing) return 1;
      if (bMissing) return -1;
      let comparison = NUMERIC_KEYS.has(sort.key)
        ? Number(aValue) - Number(bValue)
        : String(aValue).localeCompare(String(bValue));
      if (comparison === 0) comparison = a.englishMoveName.localeCompare(b.englishMoveName);
      return sort.direction === 'ascending' ? comparison : -comparison;
    });
  };

  const renderTables = (): void => {
    const methods = [...rowsByMethod.keys()].sort((a, b) => {
      const [aGroup, aName] = moveMethodOrder(a);
      const [bGroup, bName] = moveMethodOrder(b);
      if (aGroup !== bGroup) return aGroup - bGroup;
      return aName.localeCompare(bName);
    });
    const tables = methods.map((method) => {
      const rows = rowsByMethod.get(method) ?? [];
      const sort = sortStates.get(method) ?? null;
      return buildMoveTable(method, sortedRows(method, rows, sort), sort, (key) => {
        const current = sortStates.get(method) ?? null;
        sortStates.set(
          method,
          current && current.key === key
            ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
            : { key, direction: 'ascending' },
        );
        renderTables();
      });
    });
    content.replaceChildren(...tables);
  };

  const loadGame = async (gameName: string): Promise<void> => {
    const version = ++tableVersion;
    const requestedNames = movesInGame(gameName);
    const missing = requestedNames.filter((moveName) => !moveByName.has(moveName));
    const records = await mapLimit(missing, 16, (moveName) =>
      fetchRecord(`move/${encodeURIComponent(moveName)}`),
    );
    if (version !== tableVersion || !ctx.isCurrent()) return;
    missing.forEach((moveName, index) => moveByName.set(moveName, records[index]));
    rowsByMethod.clear();
    for (const [method, rows] of buildRows()) rowsByMethod.set(method, rows);
    renderTables();
  };

  // Attach before populating the select so a very early change is never missed.
  gameSelect.addEventListener('change', () => {
    selectedGame = gameSelect.value;
    const url = new URL(window.location.href);
    url.searchParams.set('game', selectedGame);
    history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
    void loadGame(selectedGame);
  });

  gameSelect.replaceChildren(
    ...groups.map((group) => h('option', { value: group.name }, humanize(group.name))),
  );
  gameSelect.value = selectedGame;

  await loadGame(selectedGame);
}

function buildMoveTable(
  method: string,
  rows: PokemonMoveRow[],
  sort: SortState | null,
  onSort: (key: string) => void,
): HTMLTableElement {
  const columns: Array<{ key: string; label: string }> = [];
  if (method === 'level-up') columns.push({ key: 'level', label: 'Level' });
  columns.push(
    { key: 'name', label: 'Move' },
    { key: 'typeName', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  );

  const headerCells = columns.map((column) => {
    const cell = h(
      'th',
      { scope: 'col', onclick: () => onSort(column.key) },
      h('button', { type: 'button', class: 'sort-button' }, column.label),
    );
    if (sort?.key === column.key) cell.setAttribute('aria-sort', sort.direction);
    return cell;
  });

  const bodyRows = rows.map((row) => {
    const cells: Node[] = [];
    if (method === 'level-up') cells.push(h('td', {}, displayNumber(row.level)));
    cells.push(
      h(
        'td',
        {},
        h('a', { href: `/moves/${encodeURIComponent(row.moveName)}` }, row.englishMoveName),
      ),
      h(
        'td',
        {},
        row.typeName
          ? h(
              'a',
              { class: `type-badge ${typeClassFor(row.typeName)}`, href: `/types/${encodeURIComponent(row.typeName)}` },
              humanize(row.typeName),
            )
          : '—',
      ),
      h('td', {}, row.category),
      h('td', {}, displayNumber(row.power)),
      h('td', {}, displayNumber(row.accuracy)),
      h('td', {}, displayNumber(row.pp)),
    );
    return h('tr', {}, ...cells);
  });

  return h(
    'table',
    { class: 'moves-table' },
    h('caption', {}, humanize(method)),
    h('thead', {}, h('tr', {}, ...headerCells)),
    h('tbody', {}, ...bodyRows),
  );
}

function typeClassFor(typeName: string): string {
  const covered = new Set([
    'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
    'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
  ]);
  return covered.has(typeName) ? `type-${typeName}` : 'type-unknown';
}
