import { cache } from 'react';
import { apiFetch } from '../../../lib/api.js';
import { buildPokemonCards } from '../../../lib/data.js';
import { MISSING, englishName, englishShortEffect } from '../../../lib/format.js';
import { NotFound, PokemonCardList, Section } from '../../../lib/components.jsx';

export const dynamic = 'force-dynamic';

const loadAbility = cache(async (rawName) => {
  const name = decodeURIComponent(rawName).toLowerCase();
  return apiFetch(`/ability/${encodeURIComponent(name)}/`);
});

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await loadAbility(name);
  return { title: ability ? englishName(ability) : 'Not found' };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const ability = await loadAbility(name);
  if (!ability) return <NotFound />;

  const displayName = englishName(ability);
  const effect = englishShortEffect(ability) ?? MISSING;
  const cards = await buildPokemonCards(ability.pokemon ?? []);

  return (
    <>
      <h1>{displayName}</h1>

      <Section labelledBy="effect-heading" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section labelledBy="pokemon-heading" title="Pokémon">
        <p className="count-text">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>
    </>
  );
}
