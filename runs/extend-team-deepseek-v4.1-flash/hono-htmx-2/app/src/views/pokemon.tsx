import { api, apiUrl } from '../api';
import { dexNumber, englishName, humanize, latestFlavorText, typeLabel, typeLabels } from '../data';
import { Dash, Section, TypeBadge, orDash } from './components';
import { TeamButton } from './team';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

type MoveRow = {
  level: number;
  name: string;
  label: string;
  type: string;
  typeLabel: string;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
export type SortDir = 'ascending' | 'descending';
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

const sortValue = (row: MoveRow, key: SortKey): string | number | null =>
  key === 'move' ? row.label : key === 'type' ? row.typeLabel : row[key];

function sortRows(rows: MoveRow[], key?: SortKey, dir: SortDir = 'ascending') {
  const byName = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label) || a.level - b.level;
  if (!key) return [...rows].sort(byName);
  const sign = dir === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null || vb === null) return va === vb ? byName(a, b) : va === null ? 1 : -1;
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sign * cmp || byName(a, b);
  });
}

export async function loadPokemon(name: string) {
  const species = await api(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
  if (!species) return null;
  const [pokemon, chain, labels] = await Promise.all([
    api(`pokemon/${species.id}`),
    species.evolution_chain?.url ? apiUrl(species.evolution_chain.url) : null,
    typeLabels(),
  ]);
  if (!pokemon) return null;
  return { species, pokemon, chain, labels };
}

/** Version groups the Pokémon learns moves in, ordered by the version group's order. */
async function versionGroups(pokemon: any) {
  const names = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) names.add(d.version_group.name);
  const groups = await Promise.all([...names].map((n) => api(`version-group/${n}`)));
  return groups.filter(Boolean).sort((a: any, b: any) => a.order - b.order) as { name: string; order: number }[];
}

export async function loadMoves(pokemon: any, game: string | undefined) {
  const groups = await versionGroups(pokemon);
  const selected = groups.find((g) => g.name === game) ?? groups[groups.length - 1];
  const entries: { move: string; url: string; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selected?.name) continue;
      const key = `${m.move.name}|${d.move_learn_method.name}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ move: m.move.name, url: m.move.url, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const [labels, moves] = await Promise.all([
    typeLabels(),
    Promise.all([...new Set(entries.map((e) => e.url))].map(async (url) => [url, await apiUrl(url)] as const)),
  ]);
  const moveByUrl = new Map(moves);
  const methods = new Map<string, MoveRow[]>();
  for (const e of entries) {
    const move = moveByUrl.get(e.url);
    if (!move) continue;
    if (!methods.has(e.method)) methods.set(e.method, []);
    methods.get(e.method)!.push({
      level: e.level,
      name: move.name,
      label: englishName(move),
      type: move.type.name,
      typeLabel: typeLabel(labels, move.type.name),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    });
  }
  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
  const tables = [...methods]
    .sort(([a], [b]) => rank(a) - rank(b) || humanize(a).localeCompare(humanize(b)))
    .map(([method, rows]) => ({ method, rows }));
  return { groups, selected: selected?.name, tables };
}

type MovesData = Awaited<ReturnType<typeof loadMoves>>;

export const MoveTable = ({
  species,
  game,
  method,
  rows,
  sort,
  dir = 'ascending',
}: {
  species: string;
  game: string;
  method: string;
  rows: MoveRow[];
  sort?: SortKey;
  dir?: SortDir;
}) => {
  const isLevelUp = method === 'level-up';
  const columns = isLevelUp ? COLUMNS : COLUMNS.filter((c) => c.key !== 'level');
  let sorted: MoveRow[];
  if (sort) sorted = sortRows(rows, sort, dir);
  else if (isLevelUp) sorted = [...rows].sort((a, b) => a.level - b.level || a.label.localeCompare(b.label));
  else sorted = sortRows(rows);
  const id = `moves-${method}`;
  return (
    <div class="table-scroll" id={id}>
      <table class="moves-table">
        <caption>{humanize(method)}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort === c.key;
              const next: SortDir = active && dir === 'ascending' ? 'descending' : 'ascending';
              const params = new URLSearchParams({ game, method, sort: c.key, dir: next });
              return (
                <th scope="col" aria-sort={active ? dir : undefined}>
                  <button
                    type="button"
                    class="sort-button"
                    hx-get={`/pokemon/${species}/moves-table?${params}`}
                    hx-target={`#${id}`}
                    hx-swap="outerHTML"
                  >
                    {c.label}
                    <span class="sort-indicator" aria-hidden="true">
                      {active ? (dir === 'ascending' ? ' ▲' : ' ▼') : ''}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr>
              {isLevelUp && <td>{r.level}</td>}
              <td>
                <a href={`/moves/${r.name}`}>{r.label}</a>
              </td>
              <td>
                <TypeBadge type={{ name: r.type, label: r.typeLabel }} link />
              </td>
              <td>{orDash(r.category)}</td>
              <td>{orDash(r.power)}</td>
              <td>{orDash(r.accuracy)}</td>
              <td>{orDash(r.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const MoveTables = ({ species, data }: { species: string; data: MovesData }) => (
  <div id="move-tables">
    {data.tables.length === 0 && <p>No moves.</p>}
    {data.tables.map((t) => (
      <MoveTable species={species} game={data.selected ?? ''} method={t.method} rows={t.rows} />
    ))}
  </div>
);

type Chain = { species: { name: string }; evolves_to: Chain[] };
const Evolution = ({ node }: { node: Chain }) => (
  <li>
    <a href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</a>
    {node.evolves_to.length > 0 && (
      <ul>
        {node.evolves_to.map((n) => (
          <Evolution node={n} />
        ))}
      </ul>
    )}
  </li>
);

type PokemonData = NonNullable<Awaited<ReturnType<typeof loadPokemon>>>;

export const PokemonPage = ({ data, moves, team }: { data: PokemonData; moves: MovesData; team: string[] }) => {
  const { species, pokemon, chain, labels } = data;
  const name = englishName(species);
  const genus = species.genera?.find((g: any) => g.language.name === 'en')?.genus;
  const flavor = latestFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default;
  const types = [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot);
  const stats = pokemon.stats as { base_stat: number; stat: { name: string } }[];
  const total = stats.reduce((sum, s) => sum + s.base_stat, 0);
  const abilities = [...pokemon.abilities].sort((a: any, b: any) => a.slot - b.slot);
  return (
    <>
      <div class="hero">
        <div class="artwork">{artwork ? <img src={artwork} alt={name} width={288} height={288} /> : <span>{Dash}</span>}</div>
        <div class="hero-info">
          <p class="dex">{dexNumber(species.id)}</p>
          <h1>{name}</h1>
          {genus && <p class="genus">{genus}</p>}
          <p class="types">
            {types.map((t: any) => (
              <TypeBadge type={{ name: t.type.name, label: typeLabel(labels, t.type.name) }} link />
            ))}
          </p>
          <TeamButton species={species.name} team={team} />
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {flavor && <p class="flavor">{flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats-table">
          <tbody>
            {stats.map((s) => (
              <tr>
                <th scope="row">{STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)}</th>
                <td>{s.base_stat}</td>
                <td class="bar-cell" aria-hidden="true">
                  <span class="bar">
                    <span style={`width:${Math.min(100, (s.base_stat / MAX_STAT) * 100).toFixed(1)}%`}></span>
                  </span>
                </td>
              </tr>
            ))}
            <tr class="total">
              <th scope="row">Total</th>
              <td>{total}</td>
              <td class="bar-cell" aria-hidden="true">
                <span class="bar">
                  <span style={`width:${Math.min(100, (total / (MAX_STAT * stats.length || 1)) * 100).toFixed(1)}%`}></span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="bullets">
          {abilities.map((a: any) => (
            <li>
              <a href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</a>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul class="bullets evolution">
          {chain?.chain ? (
            <Evolution node={chain.chain} />
          ) : (
            <li>
              <a href={`/pokemon/${species.name}`}>{humanize(species.name)}</a>
            </li>
          )}
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        {moves.groups.length > 0 ? (
          <>
            <div class="field field-inline">
              <label for="game">Game</label>
              <select
                id="game"
                name="game"
                hx-get={`/pokemon/${species.name}/moves`}
                hx-trigger="change"
                hx-target="#move-tables"
                hx-swap="outerHTML"
                hx-sync="this:replace"
              >
                {moves.groups.map((g) => (
                  <option value={g.name} selected={g.name === moves.selected}>
                    {humanize(g.name)}
                  </option>
                ))}
              </select>
            </div>
            <MoveTables species={species.name} data={moves} />
          </>
        ) : (
          <p>No moves.</p>
        )}
      </Section>
    </>
  );
};
