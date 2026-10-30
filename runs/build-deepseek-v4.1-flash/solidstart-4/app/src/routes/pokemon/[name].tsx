import { Title } from "@solidjs/meta";
import { A, createAsync, useLocation, useParams, useSearchParams } from "@solidjs/router";
import { createEffect, For, Show } from "solid-js";
import MoveTable from "~/components/MoveTable";
import NotFound from "~/components/NotFound";
import TypeBadge from "~/components/TypeBadge";
import { dexNumber, formatMeasurement } from "~/lib/format";
import {
  getPokemonPageData,
  type EvolutionNode,
  type PokemonPageData,
} from "~/lib/queries";

function EvolutionNodeView(props: { node: EvolutionNode }) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{props.node.label}</A>
      <Show when={props.node.children.length > 0}>
        <ul>
          <For each={props.node.children}>
            {(child) => <EvolutionNodeView node={child} />}
          </For>
        </ul>
      </Show>
    </li>
  );
}

function PokemonView(props: { data: PokemonPageData }) {
  const [, setSearchParams] = useSearchParams<{ game?: string }>();

  const selectGame = (event: Event & { currentTarget: HTMLSelectElement }) => {
    setSearchParams({ game: event.currentTarget.value });
  };

  return (
    <>
      <Title>{props.data.englishName} – Pokédex</Title>

      <div class="pokemon-summary">
        <div class="artwork-card">
          <Show when={props.data.artwork}>
            <img
              src={props.data.artwork!}
              alt={props.data.englishName}
              class="artwork"
              width="288"
              height="288"
            />
          </Show>
        </div>
        <div class="summary-details">
          <div class="dex-number">{dexNumber(props.data.id)}</div>
          <h1>{props.data.englishName}</h1>
          <p class="genus">{props.data.genus}</p>
          <div class="type-badges summary-types">
            <For each={props.data.types}>
              {(type) => <TypeBadge name={type.name} label={type.label} link />}
            </For>
          </div>
          <dl class="measures">
            <div>
              <dt>Height</dt>
              <dd>{formatMeasurement(props.data.height, "m")}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{formatMeasurement(props.data.weight, "kg")}</dd>
            </div>
          </dl>
          <p class="flavor-text">{props.data.flavorText}</p>
        </div>
      </div>

      <section class="section" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            <For each={props.data.stats}>
              {(stat) => (
                <tr>
                  <th scope="row">{stat.label}</th>
                  <td>{stat.value}</td>
                  <td class="stat-bar-cell">
                    <span class="stat-track">
                      <span
                        class="stat-bar"
                        style={{ width: `${Math.min(100, (stat.value / 150) * 100)}%` }}
                      />
                    </span>
                  </td>
                </tr>
              )}
            </For>
            <tr>
              <th scope="row">Total</th>
              <td>{props.data.total}</td>
              <td class="stat-bar-cell" />
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          <For each={props.data.abilities}>
            {(ability) => (
              <li>
                <A href={`/abilities/${ability.name}`}>{ability.label}</A>
                <Show when={ability.hidden}> (hidden)</Show>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section class="section" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <ul class="evolution-list">
          <EvolutionNodeView node={props.data.evolution} />
        </ul>
      </section>

      <section id="moves" class="section" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="game-field">
          <label for="game-select">Game</label>
          <select id="game-select" value={props.data.selectedGame} onChange={selectGame}>
            <For each={props.data.gameOptions}>
              {(game) => (
                <option value={game.name} selected={game.name === props.data.selectedGame}>
                  {game.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <Show when={props.data.tables.length > 0}>
          <div class="moves-tables">
            <For each={props.data.tables}>
              {(table) => <MoveTable table={table} />}
            </For>
          </div>
        </Show>
      </section>
    </>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const [searchParams] = useSearchParams<{ game?: string }>();
  const location = useLocation();
  const gameParam = () => {
    const value = searchParams.game;
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };
  const data = createAsync(() => getPokemonPageData(params.name ?? "", gameParam()));

  createEffect(() => {
    const value = data();
    if (!value || location.hash !== "#moves" || typeof window === "undefined") return;
    requestAnimationFrame(() => {
      document.getElementById("moves")?.scrollIntoView({ block: "start" });
    });
  });

  return (
    <>
      <Show when={data() === null}>
        <NotFound />
      </Show>
      <Show when={data()} keyed>
        {(pokemon) => <PokemonView data={pokemon} />}
      </Show>
    </>
  );
}
