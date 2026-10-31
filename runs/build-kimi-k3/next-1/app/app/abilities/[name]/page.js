import { notFound } from 'next/navigation';
import { getAbility, mapToSpecies } from 'lib/api';
import { MISSING, enEffect, enName } from 'lib/format';
import { Section } from 'components/Section';
import { CardGrid, PokemonCard } from 'components/PokemonCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  return { title: ability ? enName(ability.names, ability.name) : 'Not found' };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) notFound();

  const displayName = enName(ability.names, ability.name);
  const effect = enEffect(ability.effect_entries) ?? MISSING;

  const pokemon = await mapToSpecies(
    (ability.pokemon ?? []).map((entry) => ({
      url: entry.pokemon.url,
      extra: { hidden: entry.is_hidden },
    })),
  );

  return (
    <>
      <h1 className="page-title">{displayName}</h1>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{pokemon.length} Pokémon</p>
        <CardGrid>
          {pokemon.map((s) => (
            <PokemonCard key={s.id} id={s.id} name={s.name} hidden={s.hidden} />
          ))}
        </CardGrid>
      </Section>
    </>
  );
}
