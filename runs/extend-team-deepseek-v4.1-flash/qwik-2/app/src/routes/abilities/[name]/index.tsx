import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList, NotFound, Section } from "~/components/ui";
import { abilityPage } from "~/lib/data";
import { orDash, pageTitle } from "~/lib/format";

export const useAbility = routeLoader$(async ({ params, status }) => {
  const data = await abilityPage(params.name);
  if (!data) status(404);
  return data;
});

export default component$(() => {
  const loader = useAbility();
  const ability = loader.value;
  if (!ability) return <NotFound />;
  return (
    <>
      <h1>{ability.title}</h1>
      <Section id="effect" title="Effect">
        <p>{orDash(ability.effect)}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{ability.pokemon.length} Pokémon</p>
        <CardList cards={ability.pokemon} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const ability = resolveValue(useAbility);
  return { title: pageTitle(ability ? ability.title : "Not found") };
};
