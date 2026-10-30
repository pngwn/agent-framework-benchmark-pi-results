import {
  A,
  createAsync,
  useParams,
  useSearchParams,
} from "@solidjs/router";
import { For, Show, Switch, Match, createMemo, createSignal } from "solid-js";
import {
  MISSING,
  getPokemonMoves,
  getPokemonPage,
} from "~/lib/api";
import { NotFound, PageTitle, Section, TypeLink } from "~/components";

export default function PokemonPage() {
  const params = useParams();
  const data = createAsync(() => getPokemonPage(params.name || ""));

  return (
    <Switch fallback={<Loading />}>
      <Match when={data() === null}>
        <NotFound />
      </Match>
      <Match when={data() !== undefined}>
        <PokemonView data={() => data()!} />
      </Match>
    </Switch>
  );
}

function Loading() {
  return (
    <main class="page">
      <h1>Loading…</h1>
    </main>
  );
}

function PokemonView(props: { data: () => any }) {
  const data = () => props.data();
  const totalStats = createMemo(() =>
    data().pokemon.stats.reduce(
      (sum: number, stat: any) => sum + stat.value,
      0,
    ),
  );

  return (
    <main class="page">
      <PageTitle text={`${data().species.englishName} – Pokédex`} />
      <h1>{data().species.englishName}</h1>

      <div class="pokemon-summary panel">
        <img
          class="artwork"
          src={data().pokemon.artwork}
          alt={data().species.englishName}
          width="288"
          height="288"
        />
        <div class="summary-info">
          <p class="dex-number">{data().species.dex}</p>
          <p class="genus">{data().species.genus}</p>
          <div class="type-list">
            <For each={data().pokemon.types}>
              {(type: any) => <TypeLink name={type.name} label={type.label} />}
            </For>
          </div>
          <dl class="measurements">
            <dt>Height</dt>
            <dd>{(Number(data().pokemon.height) / 10).toFixed(1)} m</dd>
            <dt>Weight</dt>
            <dd>{(Number(data().pokemon.weight) / 10).toFixed(1)} kg</dd>
          </dl>
          <p class="flavor-text">{data().species.flavor}</p>
        </div>
      </div>

      <Section title="Base stats">
        <table class="stats-table">
          <tbody>
            <For each={data().pokemon.stats}>
              {(stat: any) => (
                <tr>
                  <th scope="row">{stat.label}</th>
                  <td>
                    <span class="stat-value">{stat.value}</span>
                    <span class="stat-track" aria-hidden="true">
                      <span
                        class="stat-bar"
                        style={{
                          width: `${Math.min(100, (stat.value / 180) * 100)}%`,
                        }}
                      />
                    </span>
                  </td>
                </tr>
              )}
            </For>
            <tr>
              <th scope="row">Total</th>
              <td>
                <span class="stat-value">{totalStats()}</span>
                <span class="stat-track" aria-hidden="true">
                  <span
                    class="stat-bar"
                    style={{
                      width: `${Math.min(100, (totalStats() / 720) * 100)}%`,
                    }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul class="simple-list">
          <For each={data().pokemon.abilities}>
            {(ability: any) => (
              <li>
                <A href={`/abilities/${ability.name}`}>{ability.label}</A>
                <Show when={ability.hidden}> (hidden)</Show>
              </li>
            )}
          </For>
        </ul>
      </Section>

      <Section title="Evolution">
        <Show
          when={data().evolution}
          fallback={<p class="muted">{MISSING}</p>}
        >
          <EvolutionList nodes={[data().evolution]} />
        </Show>
      </Section>

      <MovesSection
        pokemonName={data().pokemon.name}
        games={data().games}
        defaultGame={data().defaultGame}
      />
    </main>
  );
}

function EvolutionList(props: { nodes: any[] }) {
  return (
    <ul class="evolution-list">
      <For each={props.nodes}>
        {node => (
          <li>
            <A href={`/pokemon/${node.name}`}>{node.humanized}</A>
            <Show when={node.children?.length}>
              <EvolutionList nodes={node.children} />
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}

function MovesSection(props: {
  pokemonName: string;
  games: any[];
  defaultGame: string | null;
}) {
  const [params, setParams] = useSearchParams();
  const requestedGame = () => {
    const value = (params as any).game;
    return Array.isArray(value) ? value[0] || "" : value || "";
  };
  const selectedGame = () => {
    const requested = requestedGame();
    if (props.games.some(game => game.name === requested)) return requested;
    return props.defaultGame || "";
  };
  const moves = createAsync(() =>
    selectedGame()
      ? getPokemonMoves(props.pokemonName, selectedGame())
      : Promise.resolve({ groups: [] as any[] }),
  );

  return (
    <Section title="Moves" id="moves">
      <div class="game-field">
        <label for="game-select">Game</label>
        <select
          id="game-select"
          value={selectedGame()}
          onChange={event => setParams({ game: event.currentTarget.value })}
        >
          <For each={props.games}>
            {game => (
              <option value={game.name} selected={selectedGame() === game.name}>
                {game.label}
              </option>
            )}
          </For>
        </select>
      </div>

      <Show when={moves()}>
        <For each={moves()!.groups}>
          {(group: any) => <MovesTable group={group} />}
        </For>
      </Show>
    </Section>
  );
}

type MoveRow = {
  level: number;
  move: { name: string; label: string };
  type: { name: string; label: string };
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type SortState = { key: string; dir: "ascending" | "descending" } | null;

function MovesTable(props: { group: any }) {
  const [sort, setSort] = createSignal<SortState>(null);

  const columns = createMemo(() => {
    const base = [
      {
        key: "move",
        label: "Move",
        value: (row: MoveRow) => row.move.label,
        numeric: false,
      },
      {
        key: "type",
        label: "Type",
        value: (row: MoveRow) => row.type.label,
        numeric: false,
      },
      {
        key: "category",
        label: "Category",
        value: (row: MoveRow) => row.category,
        numeric: false,
      },
      {
        key: "power",
        label: "Power",
        value: (row: MoveRow) => row.power,
        numeric: true,
      },
      {
        key: "accuracy",
        label: "Accuracy",
        value: (row: MoveRow) => row.accuracy,
        numeric: true,
      },
      {
        key: "pp",
        label: "PP",
        value: (row: MoveRow) => row.pp,
        numeric: true,
      },
    ];
    if (!props.group.level) return base;
    return [
      {
        key: "level",
        label: "Level",
        value: (row: MoveRow) => row.level,
        numeric: true,
      },
      ...base,
    ];
  });

  const sortedRows = createMemo(() => {
    const state = sort();
    if (!state) return props.group.rows as MoveRow[];
    const column = columns().find(item => item.key === state.key);
    if (!column) return props.group.rows as MoveRow[];
    return [...(props.group.rows as MoveRow[])].sort((a, b) => {
      const left = column.value(a);
      const right = column.value(b);
      const leftMissing = left === null || left === undefined;
      const rightMissing = right === null || right === undefined;
      if (leftMissing && rightMissing) return 0;
      if (leftMissing) return 1;
      if (rightMissing) return -1;
      const comparison =
        column.numeric && typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return state.dir === "ascending" ? comparison : -comparison;
    });
  });

  const toggle = (key: string) => {
    const state = sort();
    if (state?.key === key) {
      setSort({
        key,
        dir: state.dir === "ascending" ? "descending" : "ascending",
      });
    } else {
      setSort({ key, dir: "ascending" });
    }
  };

  const ariaSort = (key: string) => {
    const state = sort();
    return state?.key === key ? state.dir : undefined;
  };

  return (
    <div class="table-wrap">
      <table class="moves-table">
        <caption>{props.group.label}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {column => (
                <th scope="col" aria-sort={ariaSort(column.key)}>
                  <button type="button" onClick={() => toggle(column.key)}>
                    {column.label}
                  </button>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={sortedRows()}>
            {row => (
              <tr>
                <Show when={props.group.level}>
                  <td>{row.level}</td>
                </Show>
                <td>
                  <A href={`/moves/${row.move.name}`}>{row.move.label}</A>
                </td>
                <td>
                  <TypeLink name={row.type.name} label={row.type.label} />
                </td>
                <td>{row.category || MISSING}</td>
                <td>{row.power ?? MISSING}</td>
                <td>{row.accuracy ?? MISSING}</td>
                <td>{row.pp ?? MISSING}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
