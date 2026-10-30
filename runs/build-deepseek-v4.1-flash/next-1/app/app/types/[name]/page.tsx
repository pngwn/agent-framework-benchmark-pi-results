import type { Metadata } from 'next';
import Link from 'next/link';
import NotFoundContent from '@/components/NotFoundContent';
import PokemonCard from '@/components/PokemonCard';
import Section from '@/components/Section';
import {
  frontSpriteUrl,
  getAllSpecies,
  getAllTypes,
  type SpeciesIndexEntry,
  type TypeInfo,
} from '@/lib/api';
import { humanize } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ name: string }>;
};

const RELATIONS: { term: string; key: keyof TypeInfo['record']['damage_relations'] }[] = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const types = await getAllTypes();
  const type = types.find((entry) => entry.name === name);
  return { title: type ? type.label : 'Not found' };
}

export default async function TypePage({ params }: PageProps) {
  const { name } = await params;
  const [types, species] = await Promise.all([getAllTypes(), getAllSpecies()]);
  const type = types.find((entry) => entry.name === name);
  if (!type) return <NotFoundContent />;

  const speciesById = new Map<number, SpeciesIndexEntry>(species.map((entry) => [entry.id, entry]));
  const typeByName = new Map(types.map((entry) => [entry.name, entry]));
  const labelFor = (typeName: string) => typeByName.get(typeName)?.label ?? humanize(typeName);

  const seen = new Set<number>();
  const pokemon: SpeciesIndexEntry[] = [];
  for (const item of type.pokemon) {
    if (seen.has(item.id)) continue;
    const entry = speciesById.get(item.id);
    if (!entry) continue;
    seen.add(item.id);
    pokemon.push(entry);
  }
  pokemon.sort((a, b) => a.id - b.id);

  const moveNames = Array.from(new Set((type.moves ?? []).map((move) => move.name)));
  const moves = moveNames
    .map((moveName) => ({ name: moveName, label: humanize(moveName) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));

  return (
    <>
      <h1>{type.label}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="damage-relations">
          {RELATIONS.map((relation) => {
            const related = uniqueResourceNames(type.record.damage_relations[relation.key]).sort(
              (a, b) => labelFor(a).localeCompare(labelFor(b), 'en'),
            );
            return (
              <div className="damage-relation" key={relation.key}>
                <dt>{relation.term}</dt>
                <dd>
                  {related.length === 0
                    ? 'None'
                    : related.map((relatedType) => (
                        <Link
                          key={relatedType}
                          className={`type-badge type-${relatedType}`}
                          href={`/types/${relatedType}`}
                        >
                          {labelFor(relatedType)}
                        </Link>
                      ))}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{pokemon.length} Pokémon</p>
        <ul className="card-grid">
          {pokemon.map((entry) => (
            <PokemonCard
              key={entry.id}
              id={entry.id}
              slug={entry.name}
              name={entry.displayName}
              spriteUrl={frontSpriteUrl(entry.id)}
            />
          ))}
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        <p className="result-count">{moves.length} moves</p>
        <ul className="link-columns">
          {moves.map((move) => (
            <li key={move.name}>
              <Link href={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function uniqueResourceNames(resources: { name: string }[] | undefined): string[] {
  return Array.from(new Set((resources ?? []).map((resource) => resource.name)));
}
