import Link from 'next/link';
import NotFound from '@/components/NotFound';
import { PokemonCard, TypeBadge } from '@/components/PokemonCard';
import { Section } from '@/components/Section';
import { getTypes } from '@/lib/api';
import { buildPokemonCards } from '@/lib/cards';
import { humanize } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const typeData = await getTypes();
  const type = typeData.byName.get(name);
  if (!type) return { title: 'Not found – Pokédex' };
  return { title: `${type.english} – Pokédex` };
}

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export default async function TypePage({ params }) {
  const { name } = await params;
  const typeData = await getTypes();
  const type = typeData.byName.get(name);
  if (!type) return <NotFound />;

  const record = type.record;
  const cards = await buildPokemonCards(record.pokemon ?? []);
  const moves = (record.moves ?? [])
    .map((move) => ({
      name: move.name,
      english: humanize(move.name),
    }))
    .sort((a, b) => a.english.localeCompare(b.english));

  return (
    <>
      <h1>{type.english}</h1>

      <Section id="damage" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([label, key]) => {
            const related = record.damage_relations?.[key] ?? [];
            return (
              <div className="relation" key={key}>
                <dt>{label}</dt>
                <dd>
                  {related.length === 0 ? (
                    <span className="none-text">None</span>
                  ) : (
                    related.map((relatedType) => (
                      <TypeBadge asLink key={relatedType.name} name={relatedType.name}>
                        {typeData.byName.get(relatedType.name)?.english ?? humanize(relatedType.name)}
                      </TypeBadge>
                    ))
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{cards.length} Pokémon</p>
        {cards.length > 0 ? (
          <ul className="card-grid">
            {cards.map((card) => (
              <PokemonCard key={card.id} {...card} />
            ))}
          </ul>
        ) : (
          <p className="empty-message">No Pokémon found</p>
        )}
      </Section>

      <Section id="moves" title="Moves">
        <p className="result-count">{moves.length} moves</p>
        <ul className="move-links">
          {moves.map((move) => (
            <li key={move.name}>
              <Link href={`/moves/${move.name}`}>{move.english}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
