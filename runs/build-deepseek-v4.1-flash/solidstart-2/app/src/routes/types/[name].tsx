import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonGrid from "~/components/PokemonGrid";
import Section from "~/components/Section";
import TypeBadge from "~/components/TypeBadge";
import { typeQuery } from "~/lib/queries";

export default function TypePage() {
  const params = useParams();
  const data = createAsync(() => typeQuery(params.name));

  return (
    <Show when={data() !== undefined} fallback={null}>
      <Show when={data()} fallback={<NotFound />}>
      {(type) => (
        <>
          <Title>{type().displayName} – Pokédex</Title>
          <main class="page">
            <h1>{type().displayName}</h1>

            <Section title="Damage relations">
              <dl class="damage-relations">
                <For each={type().damageRelations}>
                  {(relation) => (
                    <div class="damage-relation">
                      <dt>{relation.term}</dt>
                      <dd>
                        <Show
                          when={relation.types.length > 0}
                          fallback={<span>None</span>}
                        >
                          <For each={relation.types}>
                            {(related) => (
                              <TypeBadge
                                name={related.name}
                                label={related.label}
                                link
                              />
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
              <p class="result-count">{type().cards.length} Pokémon</p>
              <PokemonGrid cards={type().cards} />
            </Section>

            <Section title="Moves">
              <p class="result-count">{type().moves.length} moves</p>
              <ul class="type-moves">
                <For each={type().moves}>
                  {(move) => (
                    <li>
                      <A href={`/moves/${move.name}`}>{move.label}</A>
                    </li>
                  )}
                </For>
              </ul>
            </Section>
          </main>
        </>
      )}
      </Show>
    </Show>
  );
}
