import { $, component$ } from '@builder.io/qwik';
import {
  routeLoader$,
  useLocation,
  useNavigate,
  type DocumentHead,
} from '@builder.io/qwik-city';
import { MoveTable, type MoveTableData, type MoveTableRow } from '../../../components/move-table';
import { NotFound } from '../../../components/not-found';
import {
  ApiError,
  getAllVersionGroups,
  getEvolutionChain,
  getPokemonByNameOrId,
  getSpeciesByName,
  getMoveByName,
  mapLimit,
  type EvolutionNode,
  type PokemonResource,
  type SpeciesResource,
} from '../../../lib/api';
import {
  englishName,
  humanize,
  humanizedMethodOrder,
  idFromUrl,
  latestEnglishFlavorText,
} from '../../../lib/format';

interface EvolutionItem {
  name: string;
  label: string;
  children: EvolutionItem[];
}

function toEvolutionItem(node: EvolutionNode): EvolutionItem {
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    children: node.evolves_to.map(toEvolutionItem),
  };
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export interface PokemonPageData {
  title: string;
  dex: string;
  genus: string;
  types: Array<{ name: string; label: string }>;
  artwork: string | null;
  height: string;
  weight: string;
  flavorText: string;
  stats: Array<{ label: string; value: number }>;
  statTotal: number;
  abilities: Array<{ name: string; label: string; hidden: boolean }>;
  evolution: EvolutionItem[];
  games: Array<{ name: string; label: string; order: number }>;
  selectedGame: string;
  moveGroups: MoveTableData[];
}

export const usePokemonPage = routeLoader$(async ({ params, url, status }) => {
  let species: SpeciesResource;
  try {
    species = await getSpeciesByName(params.name);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      status(404);
      return null;
    }
    throw error;
  }

  const defaultVariety = species.varieties.find((variety) => variety.is_default)
    ?? species.varieties[0];
  const pokemonId = defaultVariety ? idFromUrl(defaultVariety.pokemon.url) : species.id;
  const pokemon: PokemonResource = await getPokemonByNameOrId(pokemonId || species.id);

  const [evolutionChain, versionGroups] = await Promise.all([
    getEvolutionChain(species.evolution_chain.url),
    getAllVersionGroups(),
  ]);

  const gameNames = new Set<string>();
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details) {
      gameNames.add(detail.version_group.name);
    }
  }
  const games = versionGroups
    .filter((group) => gameNames.has(group.name))
    .map((group) => ({
      name: group.name,
      label: humanize(group.name),
      order: group.order,
    }))
    .sort((a, b) => a.order - b.order);

  const requestedGame = url.searchParams.get('game') ?? '';
  const selected = games.find((game) => game.name === requestedGame)
    ?? games[games.length - 1];

  const rawRows: Array<{ moveName: string; method: string; level: number }> = [];
  if (selected) {
    for (const move of pokemon.moves) {
      for (const detail of move.version_group_details) {
        if (detail.version_group.name !== selected.name) continue;
        rawRows.push({
          moveName: move.move.name,
          method: detail.move_learn_method.name,
          level: detail.level_learned_at,
        });
      }
    }
  }

  const uniqueMoveNames = [...new Set(rawRows.map((row) => row.moveName))];
  const moveDetails = await mapLimit(uniqueMoveNames, 20, async (name) => {
    const move = await getMoveByName(name);
    return [
      name,
      {
        englishName: englishName(move),
        typeName: move.type.name,
        typeLabel: humanize(move.type.name),
        category: humanize(move.damage_class.name),
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      },
    ] as const;
  });
  const detailByName = new Map(moveDetails);

  const rowsByMethod = new Map<string, MoveTableRow[]>();
  for (const row of rawRows) {
    const detail = detailByName.get(row.moveName);
    if (!detail) continue;
    const rows = rowsByMethod.get(row.method) ?? [];
    rows.push({
      level: row.level,
      moveName: row.moveName,
      moveLabel: detail.englishName,
      typeName: detail.typeName,
      typeLabel: detail.typeLabel,
      category: detail.category,
      power: detail.power,
      accuracy: detail.accuracy,
      pp: detail.pp,
    });
    rowsByMethod.set(row.method, rows);
  }

  const moveGroups: MoveTableData[] = [...rowsByMethod.entries()]
    .map(([name, rows]) => ({ name, label: humanize(name), rows }))
    .sort((a, b) => {
      const aOrder = humanizedMethodOrder(a.name);
      const bOrder = humanizedMethodOrder(b.name);
      return aOrder - bOrder || a.label.localeCompare(b.label);
    });

  const genus = species.genera.find((entry) => entry.language.name === 'en')?.genus ?? '—';
  const artwork =
    pokemon.sprites.other?.['official-artwork']?.front_default ??
    pokemon.sprites.front_default ??
    null;
  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({ name: entry.type.name, label: humanize(entry.type.name) }));
  const stats = pokemon.stats.map((stat) => ({
    label: STAT_LABELS[stat.stat.name] ?? humanize(stat.stat.name),
    value: stat.base_stat,
  }));

  return {
    title: englishName(species),
    dex: `#${String(species.id).padStart(4, '0')}`,
    genus,
    types,
    artwork,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavorText: latestEnglishFlavorText(species),
    stats,
    statTotal: stats.reduce((total, stat) => total + stat.value, 0),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: entry.is_hidden,
      })),
    evolution: [toEvolutionItem(evolutionChain.chain)],
    games,
    selectedGame: selected?.name ?? '',
    moveGroups,
  } satisfies PokemonPageData;
});

function renderEvolution(items: EvolutionItem[]) {
  return (
    <ul class="evolution-list">
      {items.map((item) => (
        <li key={item.name}>
          <a href={`/pokemon/${item.name}`}>{item.label}</a>
          {item.children.length ? renderEvolution(item.children) : null}
        </li>
      ))}
    </ul>
  );
}

export default component$(() => {
  const data = usePokemonPage();
  const location = useLocation();
  const navigate = useNavigate();

  if (!data.value) return <NotFound />;
  const page = data.value;

  const onGameChange$ = $((event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    const params = new URLSearchParams(location.url.searchParams);
    params.set('game', value);
    const query = params.toString();
    navigate(`${location.url.pathname}?${query}`, { replaceState: false });
  });

  return (
    <div class="pokemon-page">
      <div class="pokemon-hero">
        <div class="pokemon-artwork">
          {page.artwork ? (
            <img src={page.artwork} alt={page.title} width={288} height={288} />
          ) : null}
        </div>
        <div class="pokemon-summary">
          <div class="pokemon-dex">{page.dex}</div>
          <h1>{page.title}</h1>
          <p class="pokemon-genus">{page.genus}</p>
          <div class="type-badges">
            {page.types.map((type) => (
              <a class={`type-badge type-${type.name}`} href={`/types/${type.name}`} key={type.name}>
                {type.label}
              </a>
            ))}
          </div>
          <dl class="measurements">
            <div>
              <dt>Height</dt>
              <dd>{page.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{page.weight}</dd>
            </div>
          </dl>
          <p class="flavor-text">{page.flavorText}</p>
        </div>
      </div>

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            {page.stats.map((stat) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td>
                  <span class="stat-cell">
                    <span class="stat-number">{stat.value}</span>
                    <span class="stat-track" aria-hidden="true">
                      <span
                        class="stat-bar"
                        style={`width: ${Math.min(100, (stat.value / 255) * 100)}%`}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
            <tr key="total">
              <th scope="row">Total</th>
              <td>
                <span class="stat-cell">
                  <span class="stat-number">{page.statTotal}</span>
                  <span class="stat-track" aria-hidden="true">
                    <span
                      class="stat-bar"
                      style={`width: ${Math.min(100, (page.statTotal / 1500) * 100)}%`}
                    />
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          {page.abilities.map((ability) => (
            <li key={ability.name}>
              <a href={`/abilities/${ability.name}`}>{ability.label}</a>
              {ability.hidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {renderEvolution(page.evolution)}
      </section>

      <section class="panel moves-panel" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="game-picker">
          <label for="game-select">Game</label>
          <select id="game-select" value={page.selectedGame} onChange$={onGameChange$}>
            {page.games.map((game) => (
              <option value={game.name} selected={page.selectedGame === game.name} key={game.name}>
                {game.label}
              </option>
            ))}
          </select>
        </div>
        {page.moveGroups.map((table) => (
          <MoveTable table={table} key={table.name} />
        ))}
      </section>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemonPage) as PokemonPageData | null;
  return {
    title: data ? `${data.title} – Pokédex` : 'Not found – Pokédex',
  };
};
