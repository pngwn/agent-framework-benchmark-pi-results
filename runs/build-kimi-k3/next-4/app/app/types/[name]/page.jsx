import Link from 'next/link';
import { notFound } from 'next/navigation';
import PokemonCards from '../../../components/PokemonCards.jsx';
import Section from '../../../components/Section.jsx';
import TypeBadge from '../../../components/TypeBadge.jsx';
import { apiGet } from '../../../lib/api.js';
import { getTypes, pokemonRefsToSpecies } from '../../../lib/data.js';
import { englishName, humanize } from '../../../lib/format.js';

export const dynamic = 'force-dynamic';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

async function getType(name) {
  return apiGet(`type/${encodeURIComponent(name)}`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const type = await getType(name);
  return { title: type ? englishName(type) : 'Not found' };
}

export default async function TypePage({ params }) {
  const { name } = await params;
  const type = await getType(name);
  if (!type) notFound();

  const [allTypes, pokemon] = await Promise.all([
    getTypes(),
    pokemonRefsToSpecies(type.pokemon ?? [], (e) => e.pokemon),
  ]);
  const enByName = new Map(allTypes.map((t) => [t.name, t.en]));

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>{englishName(type)}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([term, key]) => {
            const related = (type.damage_relations?.[key] ?? [])
              .map((r) => ({ name: r.name, en: enByName.get(r.name) ?? humanize(r.name) }))
              .sort((a, b) => a.en.localeCompare(b.en));
            return (
              <div key={key}>
                <dt>{term}</dt>
                <dd>
                  {related.length > 0
                    ? related.map((r) => (
                        <TypeBadge key={r.name} name={r.name} label={r.en} href={`/types/${r.name}`} />
                      ))
                    : 'None'}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{pokemon.length} Pokémon</p>
        <PokemonCards items={pokemon} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="move-list">
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
