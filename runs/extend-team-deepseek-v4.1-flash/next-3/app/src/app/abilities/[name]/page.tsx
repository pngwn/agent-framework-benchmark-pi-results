import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { getAbility, pokemonCards } from '@/lib/api';
import { englishName, englishShortEffect, MISSING } from '@/lib/format';
import { PokemonCardList } from '@/components/pokemon-cards';
import { Section } from '@/components/section';

type Props = { params: Promise<{ name: string }> };

const loadAbility = cache((name: string) => getAbility(decodeURIComponent(name)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ability = await loadAbility((await params).name);
  return { title: ability ? englishName(ability.names, ability.name) : 'Not found' };
}

export default async function AbilityPage({ params }: Props) {
  await connection();
  const ability = await loadAbility((await params).name);
  if (!ability) notFound();

  const cards = await pokemonCards(ability.pokemon, (ref) => ({ hiddenAbility: ref.is_hidden }));

  return (
    <>
      <h1>{englishName(ability.names, ability.name)}</h1>
      <Section id="effect" title="Effect">
        <p>{englishShortEffect(ability.effect_entries) ?? MISSING}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>
    </>
  );
}
