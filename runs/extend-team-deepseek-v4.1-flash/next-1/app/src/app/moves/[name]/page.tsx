import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { getMove, getTypeLabels, pokemonCards, typeInfo } from '@/lib/api';
import { englishName, englishShortEffect, humanize, latestFlavorText, MISSING, orMissing } from '@/lib/format';
import { PokemonCardList } from '@/components/pokemon-cards';
import { Section } from '@/components/section';
import { TypeBadge } from '@/components/type-badge';

type Props = { params: Promise<{ name: string }> };

const loadMove = cache((name: string) => getMove(decodeURIComponent(name)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const move = await loadMove((await params).name);
  return { title: move ? englishName(move.names, move.name) : 'Not found' };
}

export default async function MovePage({ params }: Props) {
  await connection();
  const move = await loadMove((await params).name);
  if (!move) notFound();

  const [typeLabels, cards] = await Promise.all([
    getTypeLabels(),
    pokemonCards(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  const effect = englishShortEffect(move.effect_entries) ?? latestFlavorText(move.flavor_text_entries) ?? MISSING;

  return (
    <>
      <h1>{englishName(move.names, move.name)}</h1>
      <dl className="panel facts move-facts">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge type={typeInfo(typeLabels, move.type.name)} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class ? humanize(move.damage_class.name) : MISSING}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orMissing(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orMissing(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orMissing(move.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>
    </>
  );
}
