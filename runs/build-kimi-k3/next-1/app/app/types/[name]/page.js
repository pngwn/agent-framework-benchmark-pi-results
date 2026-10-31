import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getType, getTypeLabels, mapToSpecies } from 'lib/api';
import { enName, humanize } from 'lib/format';
import { Section } from 'components/Section';
import { TypeBadgeLink } from 'components/TypeBadge';
import { CardGrid, PokemonCard } from 'components/PokemonCard';

export const dynamic = 'force-dynamic';

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
  return { title: type ? enName(type.names, type.name) : 'Not found' };
}

export default async function TypePage({ params }) {
  const { name } = await params;
  const type = await getType(name);
  if (!type) notFound();

  const typeLabels = await getTypeLabels();
  const typeLabel = (n) => typeLabels.get(n) ?? humanize(n);

  const displayName = enName(type.names, type.name);

  const pokemon = await mapToSpecies((type.pokemon ?? []).map((e) => ({ url: e.pokemon.url })));

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1 className="page-title">{displayName}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([label, key]) => {
            const related = type.damage_relations?.[key] ?? [];
            return (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {related.length === 0
                    ? 'None'
                    : related.map((r) => (
                        <TypeBadgeLink key={r.name} name={r.name} label={typeLabel(r.name)} />
                      ))}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{pokemon.length} Pokémon</p>
        <CardGrid>
          {pokemon.map((s) => (
            <PokemonCard key={s.id} id={s.id} name={s.name} />
          ))}
        </CardGrid>
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="type-moves">
          {moves.map((m) => (
            <li key={m.name}>
              <Link href={`/moves/${m.name}`} prefetch={false}>
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
