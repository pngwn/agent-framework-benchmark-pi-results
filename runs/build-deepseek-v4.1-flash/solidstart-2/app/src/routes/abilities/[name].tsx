import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonGrid from "~/components/PokemonGrid";
import Section from "~/components/Section";
import { abilityQuery } from "~/lib/queries";

export default function AbilityPage() {
  const params = useParams();
  const data = createAsync(() => abilityQuery(params.name));

  return (
    <Show when={data() !== undefined} fallback={null}>
      <Show when={data()} fallback={<NotFound />}>
      {(ability) => (
        <>
          <Title>{ability().displayName} – Pokédex</Title>
          <main class="page">
            <h1>{ability().displayName}</h1>
            <Section title="Effect">
              <p>{ability().effect}</p>
            </Section>
            <Section title="Pokémon">
              <p class="result-count">{ability().cards.length} Pokémon</p>
              <PokemonGrid cards={ability().cards} />
            </Section>
          </main>
        </>
      )}
      </Show>
    </Show>
  );
}
