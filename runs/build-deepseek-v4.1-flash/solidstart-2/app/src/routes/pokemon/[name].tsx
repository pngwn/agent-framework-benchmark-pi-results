import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, useSearchParams } from "@solidjs/router";
import { For, Show, onMount } from "solid-js";
import MoveTable from "~/components/MoveTable";
import NotFound from "~/components/NotFound";
import Section from "~/components/Section";
import TypeBadge from "~/components/TypeBadge";
import type { EvolutionViewNode } from "~/lib/types";
import { pokemonQuery } from "~/lib/queries";

function EvolutionItem(props: { node: EvolutionViewNode }) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{props.node.displayName}</A>
      <Show when={props.node.children.length > 0}>
        <ul>
          <For each={props.node.children}>
            {(child) => <EvolutionItem node={child} />}
          </For>
        </ul>
      </Show>
    </li>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const data = createAsync(() =>
    pokemonQuery(params.name, searchParams.game ?? ""),
  );

  onMount(() => {
    if (window.location.hash === "#moves") {
      requestAnimationFrame(() => {
        document.getElementById("moves")?.scrollIntoView({ block: "start" });
      });
    }
  });

  return (
    <Show when={data() !== undefined} fallback={null}>
      <Show when={data()} fallback={<NotFound />}>
      {(pokemon) => (
        <>
          <Title>{pokemon().displayName} – Pokédex</Title>
          <main class="page">
            <div class="pokemon-hero">
              <div class="artwork-panel">
                <Show when={pokemon().artwork}>
                  <img
                    class="official-artwork"
                    src={pokemon().artwork!}
                    alt={pokemon().displayName}
                  />
                </Show>
              </div>
              <div class="pokemon-summary">
                <p class="dex-number">{pokemon().number}</p>
                <h1>{pokemon().displayName}</h1>
                <p class="genus">{pokemon().genus}</p>
                <p class="type-badges summary-types">
                  <For each={pokemon().types}>
                    {(type) => (
                      <TypeBadge name={type.name} label={type.label} link />
                    )}
                  </For>
                </p>
                <dl class="measurements">
                  <div>
                    <dt>Height</dt>
                    <dd>{pokemon().height}</dd>
                  </div>
                  <div>
                    <dt>Weight</dt>
                    <dd>{pokemon().weight}</dd>
                  </div>
                </dl>
                <p class="flavor-text">{pokemon().flavor}</p>
              </div>
            </div>

            <Section title="Base stats">
              <table class="stats-table">
                <tbody>
                  <For each={pokemon().stats}>
                    {(stat) => (
                      <tr>
                        <th scope="row">{stat.label}</th>
                        <td class="stat-value">{stat.value}</td>
                        <td class="stat-bar-cell">
                          <span class="stat-track">
                            <span
                              class="stat-fill"
                              style={{
                                width: `${Math.min(100, (stat.value / 255) * 100)}%`,
                              }}
                            />
                          </span>
                        </td>
                      </tr>
                    )}
                  </For>
                  <tr>
                    <th scope="row">Total</th>
                    <td class="stat-value">{pokemon().statTotal}</td>
                    <td class="stat-bar-cell">
                      <span class="stat-track">
                        <span
                          class="stat-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              (pokemon().statTotal / (255 * 6)) * 100,
                            )}%`,
                          }}
                        />
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section title="Abilities">
              <ul class="plain-list">
                <For each={pokemon().abilities}>
                  {(ability) => (
                    <li>
                      <A href={`/abilities/${ability.name}`}>
                        {ability.displayName}
                      </A>
                      <Show when={ability.hidden}> (hidden)</Show>
                    </li>
                  )}
                </For>
              </ul>
            </Section>

            <Section title="Evolution">
              <ul class="evolution-list">
                <For each={pokemon().evolution}>
                  {(node) => <EvolutionItem node={node} />}
                </For>
              </ul>
            </Section>

            <Section title="Moves" id="moves">
              <div class="game-control field">
                <label for="game-select">Game</label>
                <select
                  id="game-select"
                  value={pokemon().selectedGame ?? ""}
                  onChange={(event) =>
                    setSearchParams(
                      { game: event.currentTarget.value },
                      { scroll: false },
                    )
                  }
                >
                  <For each={pokemon().games}>
                    {(game) => (
                      <option
                        value={game.name}
                        selected={game.name === pokemon().selectedGame}
                      >
                        {game.label}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <For each={pokemon().moveTables}>
                {(table) => <MoveTable table={table} />}
              </For>
            </Section>
          </main>
        </>
      )}
      </Show>
    </Show>
  );
}
