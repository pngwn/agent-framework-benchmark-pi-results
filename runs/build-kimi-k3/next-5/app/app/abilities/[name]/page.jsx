import { notFound } from 'next/navigation';

import PokemonCard from '@/components/PokemonCard.jsx';
import Section from '@/components/Section.jsx';
import { apiJson } from '@/lib/api.js';
import { pokemonRefsToSpecies } from '@/lib/data.js';
import { englishName, englishShortEffect, humanize } from '@/lib/format.js';

export const dynamic = 'force-dynamic';

async function getAbility(name) {
  return apiJson(`/api/v2/ability/${encodeURIComponent(name)}/`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  return { title: ability ? (englishName(ability.names) ?? humanize(ability.name)) : 'Not found' };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const ability = await getAbility(name);
  if (!ability) notFound();

  const displayName = englishName(ability.names) ?? humanize(ability.name);
  const effect = englishShortEffect(ability.effect_entries) ?? '—';
  const pokemon = await pokemonRefsToSpecies(ability.pokemon, (entry) => ({
    hidden: entry.is_hidden,
  }));

  return (
    <>
      <h1>{displayName}</h1>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{pokemon.length} Pokémon</p>
        <ul className="cards">
          {pokemon.map((s) => (
            <PokemonCard
              key={s.id}
              id={s.id}
              speciesName={s.name}
              note={s.hidden ? 'Hidden ability' : null}
            />
          ))}
        </ul>
      </Section>
    </>
  );
}
