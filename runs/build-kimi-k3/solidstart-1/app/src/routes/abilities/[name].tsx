import { Title } from "@solidjs/meta";
import { createAsync, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import { getAbilityPageData } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getAbilityPageData(params.name),
} satisfies RouteDefinition;

export default function AbilityPage(props: { params: { name: string } }) {
  const data = createAsync(() => getAbilityPageData(props.params.name));
  return (
    <Show when={data()} fallback={<Show when={data() === null}><NotFound /></Show>}>
      {(d) => (
        <>
          <Title>{`${d().en} – Pokédex`}</Title>
          <h1>{d().en}</h1>

          <section class="section" aria-labelledby="effect-heading">
            <h2 id="effect-heading">Effect</h2>
            <p>{d().effect ?? "—"}</p>
          </section>

          <section class="section" aria-labelledby="pokemon-heading">
            <h2 id="pokemon-heading">Pokémon</h2>
            <p class="count">{d().pokemon.length} Pokémon</p>
            <ul class="card-grid">
              <For each={d().pokemon}>
                {(p: any) => (
                  <PokemonCard id={p.id} name={p.name} sprite={p.sprite} hidden={p.hidden} />
                )}
              </For>
            </ul>
          </section>
        </>
      )}
    </Show>
  );
}
