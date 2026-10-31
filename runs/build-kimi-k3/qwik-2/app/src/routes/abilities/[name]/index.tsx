import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFound } from '~/components/not-found';
import { PokemonCardList } from '~/components/pokemon-card';
import { Section } from '~/components/section';
import { apiOrNull } from '~/lib/api';
import { cardsForPokemonRefs } from '~/lib/data';
import { EM_DASH, englishName } from '~/lib/format';

export const useAbility = routeLoader$(async (ev) => {
  const name = decodeURIComponent(ev.params.name).toLowerCase();
  const ability = await apiOrNull(`/ability/${encodeURIComponent(name)}/`);
  if (!ability) {
    ev.status(404);
    return null;
  }
  const pokemon = await cardsForPokemonRefs(ability.pokemon as any[]);
  const effectEntry = (ability.effect_entries as any[]).find((e) => e.language?.name === 'en');
  const effect = effectEntry?.short_effect?.replace(/\s+/g, ' ').trim() ?? EM_DASH;

  return {
    english: englishName(ability.names, ability.name),
    effect,
    pokemon,
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbility);
  return {
    title: data ? `${data.english} – Pokédex` : 'Not found – Pokédex',
  };
};

export default component$(() => {
  const data = useAbility().value;
  if (!data) return <NotFound />;

  return (
    <>
      <h1>{data.english}</h1>
      <Section headingId="effect-heading" title="Effect">
        <p>{data.effect}</p>
      </Section>
      <Section headingId="pokemon-heading" title="Pokémon">
        <p class="count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </Section>
    </>
  );
});
