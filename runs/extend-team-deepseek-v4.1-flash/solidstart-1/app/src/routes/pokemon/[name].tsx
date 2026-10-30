import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { For, Match, Show, Switch } from "solid-js";
import MoveTable from "~/components/MoveTable";
import NotFound from "~/components/NotFound";
import Section from "~/components/Section";
import { TypeLink } from "~/components/TypeBadge";
import { dexNumber, pageTitle } from "~/lib/format";
import { getPokemon, getPokemonMoves } from "~/lib/queries";
import { useTeam } from "~/lib/team";
import type { EvolutionNode, PokemonDetail } from "~/lib/types";

const MAX_STAT = 255;

export const route = {
  preload: ({ params }) => getPokemon(params.name!),
} satisfies RouteDefinition;

function Evolution(props: { nodes: EvolutionNode[] }) {
  return (
    <ul class="evolution">
      <For each={props.nodes}>
        {(node) => (
          <li>
            <A href={`/pokemon/${node.name}`}>{node.label}</A>
            <Show when={node.children.length}>
              <Evolution nodes={node.children} />
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}

function Stats(props: { stats: PokemonDetail["stats"] }) {
  const total = () => props.stats.reduce((sum, s) => sum + s.value, 0);
  const row = (label: string, value: number, max: number, extra = "") => (
    <tr class={extra}>
      <th scope="row">{label}</th>
      <td class="stat-value">{value}</td>
      <td class="stat-bar-cell">
        <div class="stat-bar" aria-hidden="true">
          <div class="stat-bar__fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
        </div>
      </td>
    </tr>
  );
  return (
    <table class="stats-table">
      <tbody>
        <For each={props.stats}>{(s) => row(s.label, s.value, MAX_STAT)}</For>
        {row("Total", total(), MAX_STAT * Math.max(1, props.stats.length), "stats-total")}
      </tbody>
    </table>
  );
}

function TeamToggle(props: { name: string }) {
  const team = useTeam();
  return (
    <div class="team-toggle">
      <Show
        when={team.isOnTeam(props.name)}
        fallback={
          <>
            <button type="button" class="action-button" disabled={team.isFull()} onClick={() => team.add(props.name)}>
              Add to team
            </button>
            <Show when={team.isFull()}>
              <span class="team-toggle__note">Team is full</span>
            </Show>
          </>
        }
      >
        <button type="button" class="action-button" onClick={() => team.remove(props.name)}>
          Remove from team
        </button>
      </Show>
    </div>
  );
}

function Moves(props: { pokemon: PokemonDetail }) {
  const [params, setParams] = useSearchParams();
  const game = () => {
    const requested = Array.isArray(params.game) ? params.game[0] : params.game;
    const games = props.pokemon.games;
    return games.some((g) => g.name === requested) ? requested! : games.at(-1)?.name ?? "";
  };
  const tables = createAsync(async () => (game() ? getPokemonMoves(props.pokemon.name, game()) : []));

  return (
    <Section title="Moves" id="moves">
      <Show when={props.pokemon.games.length} fallback={<p>—</p>}>
        <div class="field field--inline">
          <label for="game-select">Game</label>
          <select id="game-select" onChange={(e) => setParams({ game: e.currentTarget.value })}>
            <For each={props.pokemon.games}>
              {(g) => (
                <option value={g.name} selected={g.name === game()}>
                  {g.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <For each={tables() ?? []}>
          {(table) => <MoveTable caption={table.label} rows={table.rows} showLevel={table.method === "level-up"} />}
        </For>
      </Show>
    </Section>
  );
}

function Pokemon(props: { pokemon: PokemonDetail }) {
  const p = () => props.pokemon;
  return (
    <>
      <Title>{pageTitle(p().label)}</Title>
      <div class="profile">
        <div class="profile__art">
          <Show when={p().artwork}>
            <img src={p().artwork!} alt={p().label} width="475" height="475" />
          </Show>
        </div>
        <div class="profile__info">
          <p class="profile__dex">{dexNumber(p().id)}</p>
          <h1 class="profile__name">{p().label}</h1>
          <p class="profile__genus">{p().genus}</p>
          <ul class="badge-list">
            <For each={p().types}>
              {(type) => (
                <li>
                  <TypeLink type={type} />
                </li>
              )}
            </For>
          </ul>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{`${(p().height / 10).toFixed(1)} m`}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{`${(p().weight / 10).toFixed(1)} kg`}</dd>
            </div>
          </dl>
          <Show when={p().flavor}>
            <p class="profile__flavor">{p().flavor}</p>
          </Show>
        </div>
      </div>

      <TeamToggle name={p().name} />

      <Section title="Base stats">
        <Stats stats={p().stats} />
      </Section>

      <Section title="Abilities">
        <ul class="plain-list">
          <For each={p().abilities}>
            {(a) => (
              <li>
                <A href={`/abilities/${a.name}`}>{a.label}</A>
                {a.hidden ? " (hidden)" : ""}
              </li>
            )}
          </For>
        </ul>
      </Section>

      <Section title="Evolution">
        <Show when={p().evolution}>{(root) => <Evolution nodes={[root()]} />}</Show>
      </Section>

      <Moves pokemon={p()} />
    </>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const pokemon = createAsync(() => getPokemon(params.name!));
  return (
    <Switch>
      <Match when={pokemon() === null}>
        <NotFound />
      </Match>
      <Match when={pokemon()}>{(p) => <Pokemon pokemon={p()} />}</Match>
    </Switch>
  );
}
