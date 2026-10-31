import { Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { abilityQuery } from "~/lib/queries";
import Section from "~/components/Section";
import NotFound from "~/components/NotFound";
import PokemonCards from "~/components/PokemonCards";

export default function AbilityPage() {
  const params = useParams();
  const data = createAsync(() => abilityQuery(params.name ?? ""));

  return (
    <Show when={data() !== undefined}>
      <Show when={data()} fallback={<NotFound />}>
        {(d) => (
          <main class="container">
            <Title>{d().en} – Pokédex</Title>
            <h1>{d().en}</h1>
            <Section title="Effect">
              <p>{d().effect ?? "—"}</p>
            </Section>
            <Section title="Pokémon">
              <p class="count">{d().cards.length} Pokémon</p>
              <PokemonCards cards={d().cards} />
            </Section>
          </main>
        )}
      </Show>
    </Show>
  );
}
