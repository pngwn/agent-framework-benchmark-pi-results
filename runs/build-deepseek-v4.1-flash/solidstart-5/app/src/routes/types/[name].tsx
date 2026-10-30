import { A, createAsync, useParams } from "@solidjs/router";
import { For, Match, Show, Switch } from "solid-js";
import { NotFound, PageTitle, PokemonCard, Section, TypeLink } from "~/components";
import { getTypePage } from "~/lib/api";

export default function TypePage() {
  const params = useParams();
  const data = createAsync(() => getTypePage(params.name || ""));

  return (
    <Switch fallback={<Loading />}>
      <Match when={data() === null}>
        <NotFound />
      </Match>
      <Match when={data() !== undefined}>
        <TypeView data={() => data()!} />
      </Match>
    </Switch>
  );
}

function Loading() {
  return (
    <main class="page">
      <h1>Loading…</h1>
    </main>
  );
}

function TypeView(props: { data: () => any }) {
  const data = () => props.data();
  return (
    <main class="page">
      <PageTitle text={`${data().type.label} – Pokédex`} />
      <h1>{data().type.label}</h1>

      <Section title="Damage relations">
        <dl class="damage-relations">
          <For each={data().relations}>
            {(relation: any) => (
              <div class="relation">
                <dt>{relation.term}</dt>
                <dd>
                  <Show
                    when={relation.items.length}
                    fallback={<span class="muted">None</span>}
                  >
                    <span class="type-list">
                      <For each={relation.items}>
                        {(type: any) => (
                          <TypeLink name={type.name} label={type.label} />
                        )}
                      </For>
                    </span>
                  </Show>
                </dd>
              </div>
            )}
          </For>
        </dl>
      </Section>

      <Section title="Pokémon">
        <p class="result-count">{data().cards.length} Pokémon</p>
        <ul class="pokemon-grid">
          <For each={data().cards}>
            {(card: any) => <PokemonCard card={card} />}
          </For>
        </ul>
      </Section>

      <Section title="Moves">
        <p class="result-count">{data().moves.length} moves</p>
        <ul class="move-list">
          <For each={data().moves}>
            {(move: any) => (
              <li>
                <A href={`/moves/${move.name}`}>{move.label}</A>
              </li>
            )}
          </For>
        </ul>
      </Section>
    </main>
  );
}
