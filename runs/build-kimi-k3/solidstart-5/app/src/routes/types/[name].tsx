import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { For, Match, Show, Switch } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import Section from "~/components/Section";
import { getTypePage } from "~/lib/queries";

export default function TypePage() {
  const params = useParams();
  const data = createAsync(() => getTypePage(params.name));

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

            <Section title="Damage relations">
              <dl class="relations">
                <For each={d().relations}>
                  {(r) => (
                    <div class="relation">
                      <dt>{r.term}</dt>
                      <dd>
                        <Show when={r.types.length > 0} fallback={"None"}>
                          <For each={r.types}>
                            {(t) => (
                              <A class={`type-badge type-${t.name}`} href={`/types/${t.name}`}>
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
            </Section>

            <Section title="Pokémon">
              <p class="count">{d().cards.length} Pokémon</p>
              <ul class="cards">
                <For each={d().cards}>{(c) => <PokemonCard id={c.id} name={c.name} />}</For>
              </ul>
            </Section>

            <Section title="Moves">
              <p class="count">{d().moves.length} moves</p>
              <ul class="move-list">
                <For each={d().moves}>
                  {(m) => (
                    <li>
                      <A href={`/moves/${m.name}`}>{m.en}</A>
                    </li>
                  )}
                </For>
              </ul>
            </Section>
          </main>
        )}
      </Match>
    </Switch>
  );
}
