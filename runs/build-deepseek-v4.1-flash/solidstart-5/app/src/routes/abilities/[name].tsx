import { createAsync, useParams } from "@solidjs/router";
import { For, Match, Switch } from "solid-js";
import { NotFound, PageTitle, PokemonCard, Section } from "~/components";
import { getAbilityPage } from "~/lib/api";

export default function AbilityPage() {
  const params = useParams();
  const data = createAsync(() => getAbilityPage(params.name || ""));

  return (
    <Switch fallback={<Loading />}>
      <Match when={data() === null}>
        <NotFound />
      </Match>
      <Match when={data() !== undefined}>
        <AbilityView data={() => data()!} />
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

function AbilityView(props: { data: () => any }) {
  const data = () => props.data();
  return (
    <main class="page">
      <PageTitle text={`${data().ability.label} – Pokédex`} />
      <h1>{data().ability.label}</h1>

      <Section title="Effect">
        <p>{data().effect}</p>
      </Section>

      <Section title="Pokémon">
        <p class="result-count">{data().cards.length} Pokémon</p>
        <ul class="pokemon-grid">
          <For each={data().cards}>
            {(card: any) => (
              <PokemonCard card={card} hidden={card.hidden} />
            )}
          </For>
        </ul>
      </Section>
    </main>
  );
}
