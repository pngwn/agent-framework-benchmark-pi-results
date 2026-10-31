import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { For, Match, Switch } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import Section from "~/components/Section";
import { dash } from "~/lib/format";
import { getMovePage } from "~/lib/queries";

export default function MovePage() {
  const params = useParams();
  const data = createAsync(() => getMovePage(params.name));

  return (
    <Switch>
      <Match when={data() === null}>
        <NotFound />
      </Match>
      <Match when={data()}>
        {(d) => (
          <main class="container">
            <Title>{d().en} – Pokédex</Title>
            <h1>{d().en}</h1>
            <div class="card-panel">
              <dl class="facts">
                <div>
                  <dt>Type</dt>
                  <dd>
                    <A class={`type-badge type-${d().type.name}`} href={`/types/${d().type.name}`}>
                      {d().type.en}
                    </A>
                  </dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{d().category}</dd>
                </div>
                <div>
                  <dt>Power</dt>
                  <dd>{dash(d().power)}</dd>
                </div>
                <div>
                  <dt>Accuracy</dt>
                  <dd>{dash(d().accuracy)}</dd>
                </div>
                <div>
                  <dt>PP</dt>
                  <dd>{dash(d().pp)}</dd>
                </div>
              </dl>
            </div>

            <Section title="Effect">
              <p>{d().effect}</p>
            </Section>

            <Section title="Learned by">
              <p class="count">{d().cards.length} Pokémon</p>
              <ul class="cards">
                <For each={d().cards}>{(c) => <PokemonCard id={c.id} name={c.name} />}</For>
              </ul>
            </Section>
          </main>
        )}
      </Match>
    </Switch>
  );
}
