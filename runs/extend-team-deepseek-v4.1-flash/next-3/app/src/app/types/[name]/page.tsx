import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { getType, getTypeLabels, isListedType, pokemonCards, typeInfo, type ApiType } from '@/lib/api';
import { englishName, humanize } from '@/lib/format';
import { PokemonCardList } from '@/components/pokemon-cards';
import { Section } from '@/components/section';
import { TypeBadges } from '@/components/type-badge';

type Props = { params: Promise<{ name: string }> };

const RELATIONS: [keyof ApiType['damage_relations'], string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

const loadType = cache(async (name: string) => {
  const decoded = decodeURIComponent(name);
  if (!isListedType(decoded.toLowerCase())) return null;
  return getType(decoded);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = await loadType((await params).name);
  return { title: type ? englishName(type.names, type.name) : 'Not found' };
}

export default async function TypePage({ params }: Props) {
  await connection();
  const type = await loadType((await params).name);
  if (!type) notFound();

  const [labels, cards] = await Promise.all([getTypeLabels(), pokemonCards(type.pokemon)]);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>{englishName(type.names, type.name)}</h1>
      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([key, label]) => {
            const related = type.damage_relations[key] ?? [];
            return (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{related.length ? <TypeBadges types={related.map((t) => typeInfo(labels, t.name))} /> : 'None'}</dd>
              </div>
            );
          })}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>
      <Section id="moves" title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="move-columns">
          {moves.map((m) => (
            <li key={m.name}>
              <Link href={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
