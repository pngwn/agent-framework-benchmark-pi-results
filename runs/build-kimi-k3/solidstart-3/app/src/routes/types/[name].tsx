import { For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { typeQuery } from "~/lib/queries";
import Section from "~/components/Section";
import NotFound from "~/components/NotFound";
import PokemonCards from "~/components/PokemonCards";
import { TypeBadgeLink } from "~/components/Badge";

export default function TypePage() {
  const params = useParams();
  const data = createAsync(() => typeQuery(params.name ?? ""));

  return (
    <Show when={data() !== undefined}>
      <Show when={data()} fallback={<NotFound />}>
        {(d) => (
          <main class="container">
            <Title>{d().en} – Pokédex</Title>
            <h1>{d().en}</h1>
            <Section title="Damage relations">
              <dl class="relations">
                <For each={d().relations}>
                  {(rel) => (
                    <div class="relation">
                      <dt>{rel.label}</dt>
                      <dd>
                        <Show when={rel.types.length > 0} fallback="None">
                          <For each={rel.types}>
                            {(t) => <TypeBadgeLink name={t.name} label={t.en} />}
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
              <PokemonCards cards={d().cards} />
            </Section>
            <Section title="Moves">
              <p class="count">{d().moves.length} moves</p>
              <ul class="move-list">
                <For each={d().moves}>
                  {(m) => (
                    <li>
                      <A href={`/moves/${m.name}`}>{m.humanized}</A>
                    </li>
                  )}
                </For>
              </ul>
            </Section>
          </main>
        )}
      </Show>
    </Show>
  );
}
