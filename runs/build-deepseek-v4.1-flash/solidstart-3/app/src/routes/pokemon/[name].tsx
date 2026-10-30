import { Title } from "@solidjs/meta";
import { A, useParams, useSearchParams } from "@solidjs/router";
import { For, Show, createEffect, createMemo, createResource } from "solid-js";
import MoveTable from "~/components/MoveTable";
import NotFound from "~/components/NotFound";
import TypeBadge from "~/components/TypeBadge";
import { getPokemonPage, getVersionGroupMoves } from "~/lib/data";
import {
  displayValue,
  formatDex,
  formatKilograms,
  formatMetres,
  humanize,
} from "~/lib/format";

function mediaPath(src: string | undefined): string {
  if (!src) return "";
  const index = src.indexOf("/media/");
  return index >= 0 ? src.slice(index) : src;
}

function EvolutionNode(props: { node: any }) {
  return (
    <li>
      <A href={`/pokemon/${props.node.species.name}`}>{humanize(props.node.species.name)}</A>
      <Show when={(props.node.evolves_to?.length ?? 0) > 0}>
        <ul>
          <For each={props.node.evolves_to}>
            {(child: any) => <EvolutionNode node={child} />}
          </For>
        </ul>
      </Show>
    </li>
  );
}

export default function PokemonPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page] = createResource(() => params.name, (name) => getPokemonPage(name));

  const selectedGame = createMemo(() => {
    const groups = page()?.versionGroups ?? [];
    const requested = String(searchParams.game ?? "");
    if (requested && groups.some((group) => group.name === requested)) return requested;
    return groups.at(-1)?.name ?? "";
  });

  const [moveData] = createResource(
    () => {
      const data = page();
      const game = selectedGame();
      return data && game ? { pokemon: data.pokemon, game } : undefined;
    },
    (source) => getVersionGroupMoves(source.pokemon, source.game),
  );

  createEffect(() => {
    const data = page();
    // Track the move tables too, so the jump happens after the section has settled.
    moveData();
    if (!data || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView();
  });

  const statsTotal = () => (page()?.stats ?? []).reduce((sum, stat) => sum + stat.value, 0);

  return (
    <Show
      when={!page.loading}
      fallback={
        <main class="container">
          <h1>Pokémon</h1>
        </main>
      }
    >
      <Show when={page()} fallback={<NotFound />}>
        {(data) => (
          <main class="container pokemon-page">
            <Title>{data().englishName} – Pokédex</Title>

            <div class="pokemon-hero">
              <div class="artwork-wrap">
                <img
                  class="artwork"
                  src={mediaPath(data().artwork)}
                  alt={data().englishName}
                  width="288"
                  height="288"
                />
              </div>
              <div class="hero-info">
                <p class="dex-number">{formatDex(data().species.id)}</p>
                <h1>{data().englishName}</h1>
                <Show when={data().genus}>
                  <p class="genus">{data().genus}</p>
                </Show>
                <ul class="hero-types" aria-label="Types">
                  <For each={data().types}>
                    {(type) => (
                      <li>
                        <TypeBadge name={type.name} link />
                      </li>
                    )}
                  </For>
                </ul>
                <dl class="measurements">
                  <div>
                    <dt>Height</dt>
                    <dd>{formatMetres(data().pokemon.height)}</dd>
                  </div>
                  <div>
                    <dt>Weight</dt>
                    <dd>{formatKilograms(data().pokemon.weight)}</dd>
                  </div>
                </dl>
                <Show when={data().flavor}>
                  <p class="flavor">{data().flavor}</p>
                </Show>
              </div>
            </div>

            <section class="panel" aria-labelledby="stats-heading">
              <h2 id="stats-heading">Base stats</h2>
              <table class="stats-table">
                <tbody>
                  <For each={data().stats}>
                    {(stat) => (
                      <tr>
                        <th scope="row">{stat.label}</th>
                        <td class="stat-value">{stat.value}</td>
                        <td class="stat-bar-cell">
                          <span class="stat-track">
                            <span
                              class="stat-bar"
                              style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                            />
                          </span>
                        </td>
                      </tr>
                    )}
                  </For>
                  <tr>
                    <th scope="row">Total</th>
                    <td class="stat-value">{statsTotal()}</td>
                    <td class="stat-bar-cell" />
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="panel" aria-labelledby="abilities-heading">
              <h2 id="abilities-heading">Abilities</h2>
              <ul class="plain-list abilities-list">
                <For each={data().abilities}>
                  {(ability) => (
                    <li>
                      <A href={`/abilities/${ability.name}`}>{ability.label}</A>
                      {ability.hidden && <span class="ability-hidden"> (hidden)</span>}
                    </li>
                  )}
                </For>
              </ul>
            </section>

            <section class="panel" aria-labelledby="evolution-heading">
              <h2 id="evolution-heading">Evolution</h2>
              <Show when={data().evolutionRoot} fallback={<p>—</p>}>
                <ul class="evolution-list">
                  <EvolutionNode node={data().evolutionRoot} />
                </ul>
              </Show>
            </section>

            <section class="panel" id="moves" aria-labelledby="moves-heading">
              <h2 id="moves-heading">Moves</h2>
              <div class="game-picker">
                <label for="game-select">Game</label>
                <select
                  id="game-select"
                  value={selectedGame()}
                  onChange={(event) =>
                    setSearchParams({ game: event.currentTarget.value || null })
                  }
                >
                  <For each={data().versionGroups}>
                    {(group) => <option value={group.name}>{humanize(group.name)}</option>}
                  </For>
                </select>
              </div>

              <Show when={!moveData.loading && moveData()} fallback={<p class="muted">Loading moves…</p>}>
                <For each={moveData()}>
                  {(table) => (
                    <MoveTable
                      label={table.label}
                      rows={table.rows}
                      includeLevel={table.method === "level-up"}
                    />
                  )}
                </For>
              </Show>
            </section>
          </main>
        )}
      </Show>
    </Show>
  );
}
