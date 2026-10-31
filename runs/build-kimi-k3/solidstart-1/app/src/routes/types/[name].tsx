import { Title } from "@solidjs/meta";
import { A, createAsync, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import { getTypePageData } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getTypePageData(params.name),
} satisfies RouteDefinition;

export default function TypePage(props: { params: { name: string } }) {
  const data = createAsync(() => getTypePageData(props.params.name));
  return (
    <Show when={data()} fallback={<Show when={data() === null}><NotFound /></Show>}>
      {(d) => (
        <>
          <Title>{`${d().en} – Pokédex`}</Title>
          <h1>{d().en}</h1>

          <section class="section" aria-labelledby="relations-heading">
            <h2 id="relations-heading">Damage relations</h2>
            <dl class="relations">
              <For each={d().relations}>
                {(r: any) => (
                  <div>
                    <dt>{r.label}</dt>
                    <dd>
                      <Show when={r.types.length > 0} fallback="None">
                        <For each={r.types}>
                          {(t: any) => (
                            <A href={`/types/${t.name}`} class="type-badge" data-type={t.name}>
                              {t.en}
                            </A>
                          )}
                        </For>
                      </Show>
                    </dd>
                  </div>
                )}
              </For>
            </dl>
          </section>

          <section class="section" aria-labelledby="pokemon-heading">
            <h2 id="pokemon-heading">Pokémon</h2>
            <p class="count">{d().pokemon.length} Pokémon</p>
            <ul class="card-grid">
              <For each={d().pokemon}>
                {(p: any) => <PokemonCard id={p.id} name={p.name} sprite={p.sprite} />}
              </For>
            </ul>
          </section>

          <section class="section" aria-labelledby="moves-heading">
            <h2 id="moves-heading">Moves</h2>
            <p class="count">{d().moves.length} moves</p>
            <ul class="move-links">
              <For each={d().moves}>
                {(m: any) => (
                  <li>
                    <A href={`/moves/${m.name}`}>{m.en}</A>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </>
      )}
    </Show>
  );
}
