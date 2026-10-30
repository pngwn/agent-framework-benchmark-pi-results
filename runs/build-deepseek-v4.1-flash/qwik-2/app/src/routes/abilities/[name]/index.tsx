import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";
import { NotFound } from "../../../components/NotFound";
import { PokemonCard } from "../../../components/PokemonCard";
import { loadAbilityPage } from "../../../lib/api.server";

export const useAbilityLoader = routeLoader$(async ({ params, status }) => {
  const data = await loadAbilityPage(params.name);
  if (!data) status(404);
  return data;
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbilityLoader);
  return {
    title: data ? `${data.title} – Pokédex` : "Not found – Pokédex",
  };
};

export default component$(() => {
  const data = useAbilityLoader();

  if (!data.value) {
    return <NotFound />;
  }

  const ability = data.value;

  return (
    <>
      <h1>{ability.title}</h1>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p className="effect-text">{ability.effect}</p>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="section-count">{ability.cards.length} Pokémon</p>
        <ul className="pokemon-grid">
          {ability.cards.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </ul>
      </section>
    </>
  );
});
