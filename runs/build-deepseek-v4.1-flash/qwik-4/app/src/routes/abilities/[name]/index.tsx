import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  englishName,
  getRecord,
  idFromUrl,
  speciesCardsFromRefs,
} from "../../../lib/data";
import { NotFound } from "../../../components/not-found";
import { PokemonCard } from "../../../components/ui";

export const useAbilityData = routeLoader$(async ({ params }) => {
  const ability = await getRecord("ability", params.name);
  if (!ability) return { notFound: true as const };

  const hiddenBySpecies = new Map<number, boolean>();
  for (const entry of ability.pokemon ?? []) {
    if (entry.is_hidden) {
      const id = idFromUrl(entry.pokemon?.url);
      if (id) hiddenBySpecies.set(id, true);
    }
  }
  const pokemon = await speciesCardsFromRefs(
    (ability.pokemon ?? []).map((entry: any) => entry.pokemon),
    hiddenBySpecies,
  );
  const effect = (ability.effect_entries ?? []).find(
    (entry: any) => entry.language?.name === "en" && entry.short_effect,
  )?.short_effect;

  return {
    notFound: false as const,
    englishName: englishName(ability),
    effect: effect || "—",
    pokemon,
  };
});

export default component$(() => {
  const data = useAbilityData();
  if (data.value.notFound) return <NotFound />;
  const ability = data.value;

  return (
    <>
      <h1>{ability.englishName}</h1>

      <section class="panel" aria-labelledby="ability-effect-heading">
        <h2 id="ability-effect-heading">Effect</h2>
        <p>{ability.effect}</p>
      </section>

      <section class="panel" aria-labelledby="ability-pokemon-heading">
        <h2 id="ability-pokemon-heading">Pokémon</h2>
        <p class="count">{ability.pokemon.length} Pokémon</p>
        <ul class="card-grid">
          {ability.pokemon.map((card) => (
            <PokemonCard key={card.id} card={card} />
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbilityData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.englishName} – Pokédex` };
};
