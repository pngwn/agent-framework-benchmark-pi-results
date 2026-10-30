import { get, getByName, typeNames, type EvolutionChain, type EvolutionNode, type Move, type Pokemon, type Species, type VersionGroup } from '../api';
import { section, typeBadge } from '../components';
import { fragment, h, type Child } from '../dom';
import { EM_DASH, dexNumber, englishName, humanize, latestEnglishFlavorText, orDash } from '../format';
import type { PageContext, PageResult } from '../main';
import { addToTeam, getTeam, removeFromTeam, TEAM_SIZE } from '../team';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;

export async function renderPokemon(ctx: PageContext, name: string): Promise<PageResult> {
  const species = await getByName<Species>('pokemon-species', name);
  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const [pokemon, chain] = await Promise.all([
    get<Pokemon>(variety ? variety.pokemon.url : `pokemon/${species.id}`),
    species.evolution_chain ? get<EvolutionChain>(species.evolution_chain.url) : Promise.resolve(null),
  ]);
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot);
  const typeLabels = await typeNames(types.map((t) => t.type.name));

  const title = englishName(species);
  const genus = species.genera.find((g) => g.language.name === 'en')?.genus;
  const flavor = latestEnglishFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;

  const teamAction = h('div', { class: 'team-action' });
  const renderTeamAction = () => {
    const team = getTeam();
    const onTeam = team.includes(species.name);
    const full = team.length >= TEAM_SIZE;
    teamAction.replaceChildren(
      fragment(
        h(
          'button',
          {
            type: 'button',
            class: 'team-button',
            disabled: !onTeam && full,
            onclick: () => {
              if (getTeam().includes(species.name)) removeFromTeam(species.name);
              else addToTeam(species.name);
              renderTeamAction();
            },
          },
          onTeam ? 'Remove from team' : 'Add to team',
        ),
        !onTeam && full ? h('span', { class: 'team-full' }, 'Team is full') : null,
      ),
    );
  };
  renderTeamAction();


  const movesBody = h('div', { class: 'moves-body' });
  const movesSection = section('Moves', [movesBody], { id: 'moves' });

  ctx.main.append(
    h(
      'div',
      { class: 'pokemon-hero' },
      h(
        'div',
        { class: 'pokemon-hero__art' },
        artwork ? h('img', { src: artwork, alt: title, width: 288, height: 288 }) : h('span', { class: 'muted' }, 'No artwork'),
      ),
      h(
        'div',
        { class: 'pokemon-hero__info' },
        h('p', { class: 'pokemon-hero__dex' }, dexNumber(species.id)),
        h('h1', null, title),
        teamAction,
        genus ? h('p', { class: 'pokemon-hero__genus' }, genus) : null,
        h(
          'ul',
          { class: 'type-list', 'aria-label': 'Types' },
          types.map((t) => h('li', null, typeBadge(t.type.name, typeLabels.get(t.type.name) ?? humanize(t.type.name)))),
        ),
        h(
          'dl',
          { class: 'facts' },
          h('div', null, h('dt', null, 'Height'), h('dd', null, `${(pokemon.height / 10).toFixed(1)} m`)),
          h('div', null, h('dt', null, 'Weight'), h('dd', null, `${(pokemon.weight / 10).toFixed(1)} kg`)),
        ),
        flavor ? h('p', { class: 'pokemon-hero__flavor' }, flavor) : null,
      ),
    ),
    statsSection(pokemon),
    abilitiesSection(pokemon),
    evolutionSection(chain, species),
    movesSection,
  );

  const ready = setupMoves(ctx, pokemon, movesBody);
  return { title, nav: 'pokemon', ready };
}

function statsSection(pokemon: Pokemon): HTMLElement {
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const row = (label: string, value: number, max: number, cls?: string) =>
    h(
      'tr',
      { class: cls },
      h('th', { scope: 'row' }, label),
      h('td', { class: 'stat-value' }, value),
      h(
        'td',
        { class: 'stat-bar-cell' },
        h('div', { class: 'stat-bar', 'aria-hidden': 'true' }, h('div', { class: 'stat-bar__fill', style: `width: ${Math.min(100, (value / max) * 100).toFixed(1)}%` })),
      ),
    );
  return section('Base stats', [
    h(
      'table',
      { class: 'stats' },
      h(
        'tbody',
        null,
        pokemon.stats.map((s) => row(STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), s.base_stat, MAX_STAT)),
        row('Total', total, MAX_STAT * Math.max(1, pokemon.stats.length), 'stats__total'),
      ),
    ),
  ]);
}

function abilitiesSection(pokemon: Pokemon): HTMLElement {
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  return section('Abilities', [
    abilities.length
      ? h(
          'ul',
          { class: 'plain-list' },
          abilities.map((a) =>
            h('li', null, h('a', { href: `/abilities/${a.ability.name}` }, humanize(a.ability.name)), a.is_hidden ? ' (hidden)' : null),
          ),
        )
      : h('p', null, EM_DASH),
  ]);
}

function evolutionSection(chain: EvolutionChain | null, species: Species): HTMLElement {
  const node = (n: EvolutionNode): HTMLLIElement =>
    h(
      'li',
      null,
      h('a', { href: `/pokemon/${n.species.name}`, 'aria-current': n.species.name === species.name ? 'page' : null }, humanize(n.species.name)),
      n.evolves_to.length ? h('ul', null, n.evolves_to.map(node)) : null,
    );
  const root: EvolutionNode = chain?.chain ?? { species: { name: species.name, url: '' }, evolves_to: [] };
  return section('Evolution', [h('ul', { class: 'evolution' }, node(root))]);
}

// ---- Moves ----

interface MoveRow {
  level: number;
  name: string;
  label: string;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type ColumnKey = 'level' | 'label' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';

const COLUMNS: { key: ColumnKey; label: string; numeric?: boolean }[] = [
  { key: 'level', label: 'Level', numeric: true },
  { key: 'label', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
];

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

async function setupMoves(ctx: PageContext, pokemon: Pokemon, body: HTMLElement): Promise<void> {
  const groupNames = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) groupNames.add(d.version_group.name);
  if (!groupNames.size) {
    body.replaceChildren(h('p', null, 'This Pokémon learns no moves.'));
    return;
  }
  const groups = (await Promise.all([...groupNames].map((n) => getByName<VersionGroup>('version-group', n)))).sort((a, b) => a.order - b.order);
  if (!ctx.isCurrent()) return;

  const requested = new URL(location.href).searchParams.get('game');
  let selected = groups.find((g) => g.name === requested)?.name ?? groups[groups.length - 1].name;

  const select = h(
    'select',
    { id: 'game-select' },
    groups.map((g) => h('option', { value: g.name, selected: g.name === selected }, humanize(g.name))),
  );
  const tables = h('div', { class: 'move-tables' });
  body.replaceChildren(h('div', { class: 'game-picker' }, h('label', { for: 'game-select' }, 'Game'), select), tables);

  let token = 0;
  const show = async () => {
    const mine = ++token;
    tables.setAttribute('aria-busy', 'true');
    const content = await moveTables(pokemon, selected);
    if (mine !== token || !ctx.isCurrent()) return;
    tables.replaceChildren(fragment(content));
    tables.removeAttribute('aria-busy');
  };

  select.addEventListener('change', () => {
    selected = select.value;
    const url = new URL(location.href);
    url.searchParams.set('game', selected);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    void show();
  });

  await show();
}

async function moveTables(pokemon: Pokemon, group: string): Promise<Child[]> {
  const entries: { move: string; url: string; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== group) continue;
      const key = `${m.move.name}|${d.move_learn_method.name}|${d.move_learn_method.name === 'level-up' ? d.level_learned_at : ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ move: m.move.name, url: m.move.url, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const moves = new Map<string, Move>();
  await Promise.all(
    [...new Set(entries.map((e) => e.url))].map(async (url) => {
      const move = await get<Move>(url);
      moves.set(url, move);
    }),
  );
  const labels = await typeNames([...moves.values()].map((m) => m.type.name));

  const byMethod = new Map<string, MoveRow[]>();
  for (const e of entries) {
    const move = moves.get(e.url)!;
    const row: MoveRow = {
      level: e.level,
      name: move.name,
      label: englishName(move),
      type: move.type.name,
      typeLabel: labels.get(move.type.name) ?? humanize(move.type.name),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
    let rows = byMethod.get(e.method);
    if (!rows) byMethod.set(e.method, (rows = []));
    rows.push(row);
  }

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    return humanize(a).localeCompare(humanize(b));
  });
  return methods.map((method) => moveTable(method, byMethod.get(method)!));
}

function compareValues(a: string | number | null, b: string | number | null, dir: 1 | -1): number {
  // Missing values sort last in both directions.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return result * dir;
}

function moveTable(method: string, rows: MoveRow[]): HTMLElement {
  const isLevelUp = method === 'level-up';
  const columns = COLUMNS.filter((c) => c.key !== 'level' || isLevelUp);
  const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);
  const defaultSort = (a: MoveRow, b: MoveRow) => (isLevelUp ? a.level - b.level : 0) || byName(a, b);

  let sort: { key: ColumnKey; dir: 1 | -1 } | null = null;
  const tbody = h('tbody');
  const headers = new Map<ColumnKey, HTMLTableCellElement>();

  const renderRows = () => {
    const sorted = [...rows].sort((a, b) => (sort ? compareValues(a[sort.key], b[sort.key], sort.dir) || defaultSort(a, b) : defaultSort(a, b)));
    tbody.replaceChildren(
      ...sorted.map((r) =>
        h(
          'tr',
          null,
          isLevelUp ? h('td', { class: 'num' }, r.level) : null,
          h('td', null, h('a', { href: `/moves/${r.name}` }, r.label)),
          h('td', null, typeBadge(r.type, r.typeLabel)),
          h('td', null, orDash(r.category)),
          h('td', { class: 'num' }, orDash(r.power)),
          h('td', { class: 'num' }, orDash(r.accuracy)),
          h('td', { class: 'num' }, orDash(r.pp)),
        ),
      ),
    );
    for (const [key, th] of headers) {
      if (sort?.key === key) th.setAttribute('aria-sort', sort.dir === 1 ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    }
  };

  const headerRow = h(
    'tr',
    null,
    columns.map((c) => {
      const th = h(
        'th',
        { scope: 'col' },
        h(
          'button',
          {
            type: 'button',
            class: 'sort-button',
            onclick: () => {
              sort = sort?.key === c.key ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 };
              renderRows();
            },
          },
          c.label,
          h('span', { class: 'sort-indicator', 'aria-hidden': 'true' }),
        ),
      );
      headers.set(c.key, th);
      return th;
    }),
  );

  renderRows();
  return h(
    'div',
    { class: 'move-table-wrap' },
    h('table', { class: 'move-table' }, h('caption', null, humanize(method)), h('thead', null, headerRow), tbody),
  );
}
