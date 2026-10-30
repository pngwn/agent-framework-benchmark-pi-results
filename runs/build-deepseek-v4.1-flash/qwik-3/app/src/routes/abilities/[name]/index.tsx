import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getAbilityPage } from '~/lib/api';
import { NotFound, PokemonCards } from '~/components/ui';

export const useAbilityPage = routeLoader$(async ({ params, status }) => {
  const data = await getAbilityPage(params.name);
  if (!data) {
    status(404);
    return { notFound: true as const };
  }
  return data;
});

export default component$(() => {
  const data = useAbilityPage();
  if (data.value.notFound) return <NotFound />;
  return (
    <>
      <h1>{data.value.englishName}</h1>

      <section class="panel" aria-labelledby="ability-effect-heading">
        <h2 id="ability-effect-heading">Effect</h2>
        <p>{data.value.effect}</p>
      </section>

      <section class="panel" aria-labelledby="ability-pokemon-heading">
        <h2 id="ability-pokemon-heading">Pokémon</h2>
        <p class="result-count">{data.value.pokemon.length} Pokémon</p>
        <PokemonCards cards={data.value.pokemon} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbilityPage);
  return { title: data.notFound ? 'Not found – Pokédex' : `${data.englishName} – Pokédex` };
};
