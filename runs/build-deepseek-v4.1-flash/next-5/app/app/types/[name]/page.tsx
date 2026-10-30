import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PokemonCard } from '../../components/PokemonCard';
import { getCatalog } from '../../lib/catalog';
import { getTypePageData, isNotFound } from '../../lib/data';
import { humanize } from '../../lib/models';

export const dynamic = 'force-dynamic';

interface TypePageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: TypePageProps): Promise<Metadata> {
  const { name } = await params;
  const catalog = await getCatalog();
  const type = catalog.typesByName.get(name.toLowerCase());
  return { title: type ? type.label : 'Not found' };
}

const RELATIONS: { key: string; term: string }[] = [
  { key: 'double_damage_to', term: 'Super effective against' },
  { key: 'half_damage_to', term: 'Not very effective against' },
  { key: 'no_damage_to', term: 'No effect against' },
  { key: 'double_damage_from', term: 'Weak to' },
  { key: 'half_damage_from', term: 'Resists' },
  { key: 'no_damage_from', term: 'Immune to' },
];

export default async function TypePage({ params }: TypePageProps) {
  const { name } = await params;
  const data = await getTypePageData(name);

  if (isNotFound(data)) notFound();

  const catalog = await getCatalog();
  const labelFor = (typeName: string) =>
    catalog.typesByName.get(typeName)?.label ?? humanize(typeName);

  return (
    <main className="shell page">
      <h1>{data.type.label}</h1>

      <section className="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl className="relations">
          {RELATIONS.map((relation) => {
            const entries = data.type.damageRelations[relation.key] ?? [];
            return (
              <div className="relation" key={relation.key}>
                <dt>{relation.term}</dt>
                <dd>
                  {entries.length === 0 ? (
                    <span className="none">None</span>
                  ) : (
                    entries.map((type) => (
                      <Link key={type.name} href={`/types/${type.name}`} className={`type-badge type-${type.name}`}>
                        {labelFor(type.name)}
                      </Link>
                    ))
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count">{data.pokemon.length} Pokémon</p>
        <ul className="card-grid">
          {data.pokemon.map((card) => (
            <PokemonCard key={card.id} card={card} />
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p className="count">{data.moves.length} moves</p>
        <ul className="move-links">
          {data.moves.map((move) => (
            <li key={move.name}>
              <Link href={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
