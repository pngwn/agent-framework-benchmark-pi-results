import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFoundContent } from '../../../components/not-found';
import { CardGrid } from '../../../components/pokemon-card';
import { Section } from '../../../components/section';
import { api } from '../../../lib/api';
import { cardsForPokemonRefs } from '../../../lib/data';
import { englishName, humanize, idFromUrl, isDefaultPokemonId } from '../../../lib/util';

export const useAbilityData = routeLoader$(async (ev) => {
  const name = ev.params.name.toLowerCase();
  const ability = await api(`ability/${name}`);
  if (!ability) {
    ev.status(404);
    return null;
  }

  const shortEffect = ability.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect;
  const effect = shortEffect ? String(shortEffect).replace(/\s+/g, ' ').trim() : '—';

  const hiddenById = new Map<number, boolean>();
  for (const p of ability.pokemon ?? []) {
    const id = idFromUrl(p.pokemon.url);
    if (isDefaultPokemonId(id)) hiddenById.set(id, !!p.is_hidden);
  }
  const cards = await cardsForPokemonRefs(
    (ability.pokemon ?? []).map((p: any) => p.pokemon),
    hiddenById,
  );

  return {
    heading: englishName(ability.names) ?? humanize(ability.name),
    effect,
    cards,
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbilityData);
  return { title: data ? `${data.heading} – Pokédex` : 'Not found – Pokédex' };
};

export default component$(() => {
  const data = useAbilityData();
  const d = data.value;
  if (!d) return <NotFoundContent />;

  return (
    <>
      <h1>{d.heading}</h1>
      <Section title="Effect" headingId="effect-heading">
        <p>{d.effect}</p>
      </Section>
      <Section title="Pokémon" headingId="pokemon-heading">
        <p class="count">{d.cards.length} Pokémon</p>
        <CardGrid cards={d.cards} />
      </Section>
    </>
  );
});
