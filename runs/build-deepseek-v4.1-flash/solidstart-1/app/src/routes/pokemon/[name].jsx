import { Title } from "@solidjs/meta";
import { A, createAsync, query, useParams, useSearchParams } from "@solidjs/router";
import { For, Show, createMemo, onMount } from "solid-js";
import MoveTables from "~/components/MoveTables";
import NotFound from "~/components/NotFound";
import Section from "~/components/Section";
import { loadPokemonPage } from "~/server/data";

const getPokemonPage = query(loadPokemonPage, "pokemon-page");

function EvolutionNode(props) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{props.node.label}</A>
      <Show when={props.node.evolvesTo.length}>
        <ul>
          <For each={props.node.evolvesTo}>
            {(child) => <EvolutionNode node={child} />}
          </For>
        </ul>
      </Show>
    </li>
  );
}

function PokemonPage(props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const data = props.data;

  const selectedGame = createMemo(() => {
    const requested = searchParams.game;
    if (requested && data.games.some((game) => game.name === requested)) return requested;
    return data.defaultGame;
  });

  const tables = () => data.tablesByGame[selectedGame()] ?? [];

  onMount(() => {
    if (window.location.hash === "#moves") {
      document.getElementById("moves")?.scrollIntoView();
    }
  });

  return (
    <>
      <Title>{data.englishName} – Pokédex</Title>
      <main class="container">
        <div class="pokemon-summary">
          <Show when={data.artwork}>
            <img class="artwork" src={data.artwork} alt={data.englishName} />
          </Show>
          <div class="summary-body">
            <p class="dex">{data.dex}</p>
            <h1>{data.englishName}</h1>
            <p class="genus">{data.genus}</p>
            <div class="type-list">
              <For each={data.types}>
                {(type) => (
                  <A class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>
                    {type.label}
                  </A>
                )}
              </For>
            </div>
            <dl class="facts">
              <div>
                <dt>Height</dt>
                <dd>{data.height}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{data.weight}</dd>
              </div>
            </dl>
            <p class="flavor">{data.flavorText}</p>
          </div>
        </div>

        <Section title="Base stats">
          <table class="stats-table">
            <tbody>
              <For each={data.stats}>
                {(stat) => (
                  <tr>
                    <th scope="row">{stat.label}</th>
                    <td class="stat-value">{stat.value}</td>
                    <td class="stat-bar-cell">
                      <Show when={stat.label !== "Total"}>
                        <span class="stat-track">
                          <span
                            class="stat-fill"
                            style={{ width: `${Math.min(100, (Number(stat.value) / 255) * 100)}%` }}
                          />
                        </span>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Section>

        <Section title="Abilities">
          <ul class="plain-list">
            <For each={data.abilities}>
              {(ability) => (
                <li>
                  <A href={ability.href}>{ability.label}</A>
                  <Show when={ability.hidden}><span> (hidden)</span></Show>
                </li>
              )}
            </For>
          </ul>
        </Section>

        <Section title="Evolution">
          <Show when={data.evolution} fallback={<p>—</p>}>
            <ul class="evolution-tree">
              <EvolutionNode node={data.evolution} />
            </ul>
          </Show>
        </Section>

        <Section title="Moves" id="moves">
          <div class="game-select">
            <label for="game-select">Game</label>
            <select
              id="game-select"
              value={selectedGame() ?? ""}
              onChange={(event) =>
                setSearchParams(
                  { ...searchParams, game: event.currentTarget.value },
                  { replace: true },
                )
              }
            >
              <For each={data.games}>
                {(game) => (
                  <option value={game.name} selected={selectedGame() === game.name}>
                    {game.label}
                  </option>
                )}
              </For>
            </select>
          </div>
          <MoveTables tables={tables()} />
        </Section>
      </main>
    </>
  );
}

export default function PokemonRoute() {
  const params = useParams();
  const data = createAsync(() => getPokemonPage(params.name));

  return (
    <Show when={data()} fallback={<main class="container"><p>Loading…</p></main>}>
      <Show when={!data().notFound} fallback={<NotFound />}>
        <PokemonPage data={data()} />
      </Show>
    </Show>
  );
}
