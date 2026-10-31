import { notFound } from 'next/navigation';
import PokemonCards from '../../../components/PokemonCards.jsx';
import Section from '../../../components/Section.jsx';
import { apiGet } from '../../../lib/api.js';
import { pokemonRefsToSpecies } from '../../../lib/data.js';
import { collapseWhitespace, englishName } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

async function getAbility(name) {
  return apiGet(`ability/${encodeURIComponent(name)}`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  return { title: ability ? englishName(ability) : 'Not found' };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) notFound();

  // Alternate forms are excluded; a Pokémon listed more than once counts once
  // and is marked when it has the ability as a hidden ability.
  const resolved = await pokemonRefsToSpecies(ability.pokemon ?? [], (e) => e.pokemon);
  const items = resolved.map((item) => ({
    id: item.id,
    speciesName: item.speciesName,
    hidden: item.entries.some((e) => e.is_hidden),
  }));

  const shortEffect = ability.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect;
  const effect = (shortEffect && collapseWhitespace(shortEffect)) || '—';

  return (
    <>
      <h1>{englishName(ability)}</h1>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{items.length} Pokémon</p>
        <PokemonCards items={items} />
      </Section>
    </>
  );
}
