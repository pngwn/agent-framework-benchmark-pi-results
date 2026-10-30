import Link from 'next/link';
import { notFound } from 'next/navigation';

import PokeCard from '@/components/PokeCard';
import { getSpeciesByIdMap, getType, getTypeLabelMap, idFromUrl, spriteUrl } from '@/lib/data';
import { englishName, humanize } from '@/lib/display';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function generateMetadata({ params }) {
  const { name } = await params;
  const type = await getType(name);
  if (!type) return { title: 'Not found' };
  return { title: englishName(type, humanize(type.name)) };
}

export default async function TypePage({ params }) {
  const { name } = await params;
  const type = await getType(name);
  if (!type) notFound();

  const [typeLabels, speciesById] = await Promise.all([getTypeLabelMap(), getSpeciesByIdMap()]);

  const ids = new Set();
  for (const entry of type.pokemon ?? []) {
    const id = idFromUrl(entry?.pokemon?.url);
    if (id !== null && id <= 10000 && speciesById.has(id)) ids.add(id);
  }
  const pokemonSpecies = [...ids].sort((a, b) => a - b).map((id) => speciesById.get(id));

  const moves = [...(type.moves ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <h1>{englishName(type, humanize(type.name))}</h1>

      <section className="section" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl className="damageRelations">
          {RELATIONS.map(([term, key]) => {
            const related = type.damage_relations?.[key] ?? [];
            return (
              <div className="relation" key={key}>
                <dt>{term}</dt>
                <dd>
                  {related.length === 0
                    ? 'None'
                    : related.map((entry) => (
                        <Link
                          className="typeBadge"
                          data-type={entry.name}
                          href={`/types/${entry.name}`}
                          key={entry.name}
                        >
                          {typeLabels.get(entry.name) ?? humanize(entry.name)}
                        </Link>
                      ))}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count">{pokemonSpecies.length} Pokémon</p>
        <ul className="cardGrid">
          {pokemonSpecies.map((species) => (
            <PokeCard key={species.id} species={species} sprite={spriteUrl(species.id)} />
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p className="count">{moves.length} moves</p>
        <ul className="moveLinks">
          {moves.map((move) => (
            <li key={move.name}>
              <Link href={`/moves/${move.name}`}>{humanize(move.name)}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
