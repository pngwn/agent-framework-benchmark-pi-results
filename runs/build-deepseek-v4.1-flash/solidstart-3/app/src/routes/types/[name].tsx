import { Title } from "@solidjs/meta";
import { A, useParams } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCard from "~/components/PokemonCard";
import { getTypePage } from "~/lib/data";
import { humanize, typeLabel } from "~/lib/format";

const RELATIONS: { key: string; label: string }[] = [
  { key: "double_damage_to", label: "Super effective against" },
  { key: "half_damage_to", label: "Not very effective against" },
  { key: "no_damage_to", label: "No effect against" },
  { key: "double_damage_from", label: "Weak to" },
  { key: "half_damage_from", label: "Resists" },
  { key: "no_damage_from", label: "Immune to" },
];

export default function TypePage() {
  const params = useParams();
  const [type] = createResource(() => params.name, (name) => getTypePage(name));

  return (
    <Show
      when={!type.loading}
      fallback={
        <main class="container">
          <h1>Type</h1>
        </main>
      }
    >
      <Show when={type()} fallback={<NotFound />}>
        {(data) => (
          <main class="container">
            <Title>{data().englishName} – Pokédex</Title>
            <h1>{data().englishName}</h1>

            <section class="panel" aria-labelledby="damage-relations-heading">
              <h2 id="damage-relations-heading">Damage relations</h2>
              <dl class="damage-relations">
                <For each={RELATIONS}>
                  {(relation) => (
                    <div>
                      <dt>{relation.label}</dt>
                      <dd>
                        <Show
                          when={(data().relations[relation.key]?.length ?? 0) > 0}
                          fallback={<span>None</span>}
                        >
                          <For each={data().relations[relation.key]}>
                            {(related: any) => (
                              <A href={`/types/${related.name}`} class={`type-badge type-${related.name}`}>
                                {typeLabel(related.name)}
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

            <section class="panel" aria-labelledby="type-pokemon-heading">
              <h2 id="type-pokemon-heading">Pokémon</h2>
              <p class="result-count">{data().pokemon.length} Pokémon</p>
              <ul class="pokemon-grid">
                <For each={data().pokemon}>{(card) => <PokemonCard card={card} />}</For>
              </ul>
            </section>

            <section class="panel" aria-labelledby="type-moves-heading">
              <h2 id="type-moves-heading">Moves</h2>
              <p class="result-count">{data().moves.length} moves</p>
              <ul class="move-list">
                <For each={data().moves}>
                  {(move: any) => (
                    <li>
                      <A href={`/moves/${move.name}`}>{humanize(move.name)}</A>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          </main>
        )}
      </Show>
    </Show>
  );
}
