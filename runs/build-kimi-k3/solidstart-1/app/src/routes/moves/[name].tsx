import { Title } from "@solidjs/meta";
import { A, createAsync, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import { getMovePageData } from "~/lib/queries";
import { displayValue, humanize } from "~/lib/util";

export const route = {
  preload: ({ params }) => getMovePageData(params.name),
} satisfies RouteDefinition;

export default function MovePage(props: { params: { name: string } }) {
  const data = createAsync(() => getMovePageData(props.params.name));
  return (
    <Show when={data()} fallback={<Show when={data() === null}><NotFound /></Show>}>
      {(d) => (
        <>
          <Title>{`${d().en} – Pokédex`}</Title>
          <h1>{d().en}</h1>
          <dl class="facts facts-card">
            <div>
              <dt>Type</dt>
              <dd>
                <Show when={d().type} fallback="—">
                  <A href={`/types/${d().type.name}`} class="type-badge" data-type={d().type.name}>
                    {d().type.en}
                  </A>
                </Show>
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{d().damageClass ? humanize(d().damageClass) : "—"}</dd>
            </div>
            <div>
              <dt>Power</dt>
              <dd>{displayValue(d().power)}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{displayValue(d().accuracy)}</dd>
            </div>
            <div>
              <dt>PP</dt>
              <dd>{displayValue(d().pp)}</dd>
            </div>
          </dl>

          <section class="section" aria-labelledby="effect-heading">
            <h2 id="effect-heading">Effect</h2>
            <p>{d().effect ?? "—"}</p>
          </section>

          <section class="section" aria-labelledby="learned-by-heading">
            <h2 id="learned-by-heading">Learned by</h2>
            <p class="count">{d().learnedBy.length} Pokémon</p>
            <ul class="card-grid">
              <For each={d().learnedBy}>
                {(p: any) => <PokemonCard id={p.id} name={p.name} sprite={p.sprite} />}
              </For>
            </ul>
          </section>
        </>
      )}
    </Show>
  );
}
