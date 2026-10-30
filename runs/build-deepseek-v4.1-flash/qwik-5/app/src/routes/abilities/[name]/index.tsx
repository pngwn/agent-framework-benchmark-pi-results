import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFoundContent, PokemonCards } from "../../../components/ui";
import { cardsFromRefs, getAbility, getSpeciesIndex } from "../../../lib/api";
import { englishName } from "../../../lib/format";

export const useAbilityData = routeLoader$(async ({ params }) => {
  const [ability, speciesIndex] = await Promise.all([
    getAbility(params.name),
    getSpeciesIndex(),
  ]);
  if (!ability) return { notFound: true as const };

  const hiddenIds = new Set(
    ability.pokemon.filter((entry) => entry.is_hidden).map((entry) => entry.pokemon.name),
  );
  const cards = cardsFromRefs(
    ability.pokemon.map((entry) => entry.pokemon),
    speciesIndex,
    { includeHidden: true, hiddenIds },
  );

  return {
    notFound: false as const,
    title: englishName(ability.names, ability.name),
    effect:
      ability.effect_entries.find((entry) => entry.language.name === "en")
        ?.short_effect ?? "—",
    cards,
  };
});

export default component$(() => {
  const data = useAbilityData();
  if (data.value.notFound) return <NotFoundContent />;

  return (
    <>
      <h1>{data.value.title}</h1>

      <section class="panel" aria-labelledby="ability-effect-heading">
        <h2 id="ability-effect-heading">Effect</h2>
        <p>{data.value.effect}</p>
      </section>

      <section class="panel" aria-labelledby="ability-pokemon-heading">
        <h2 id="ability-pokemon-heading">Pokémon</h2>
        <p class="result-count">{data.value.cards.length} Pokémon</p>
        <PokemonCards cards={data.value.cards} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbilityData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.title} – Pokédex` };
};
