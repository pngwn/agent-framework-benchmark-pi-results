import { Title } from "@solidjs/meta";
import { A, useParams } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import { getMovePage } from "~/lib/data";
import { displayValue, humanize } from "~/lib/format";

export default function MovePage() {
  const params = useParams();
  const [move] = createResource(() => params.name, (name) => getMovePage(name));

  return (
    <Show
      when={!move.loading}
      fallback={
        <main class="container">
          <h1>Move</h1>
        </main>
      }
    >
      <Show when={move()} fallback={<NotFound />}>
        {(data) => (
          <main class="container">
            <Title>{data().englishName} – Pokédex</Title>
            <h1>{data().englishName}</h1>

            <div class="panel">
              <dl class="move-facts">
                <div>
                  <dt>Type</dt>
                  <dd>
                    <A href={`/types/${data().type.name}`} class="type-link">
                      {data().type.label}
                    </A>
                  </dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{data().move.damage_class?.name ? humanize(data().move.damage_class.name) : "—"}</dd>
                </div>
                <div>
                  <dt>Power</dt>
                  <dd>{displayValue(data().move.power)}</dd>
                </div>
                <div>
                  <dt>Accuracy</dt>
                  <dd>{displayValue(data().move.accuracy)}</dd>
                </div>
                <div>
                  <dt>PP</dt>
                  <dd>{displayValue(data().move.pp)}</dd>
                </div>
              </dl>
            </div>

            <section class="panel" aria-labelledby="move-effect-heading">
              <h2 id="move-effect-heading">Effect</h2>
              <p>{data().effect}</p>
            </section>

            <section class="panel" aria-labelledby="learned-by-heading">
              <h2 id="learned-by-heading">Learned by</h2>
              <p class="result-count">{data().learned.length} Pokémon</p>
              <ul class="pokemon-grid">
                <For each={data().learned}>{(card) => <PokemonCard card={card} />}</For>
              </ul>
            </section>
          </main>
        )}
      </Show>
    </Show>
  );
}
