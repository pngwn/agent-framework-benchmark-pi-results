import Link from 'next/link';
import { notFound } from 'next/navigation';

import PokemonCard from '@/components/PokemonCard.jsx';
import Section from '@/components/Section.jsx';
import TypeBadge from '@/components/TypeBadge.jsx';
import { apiJson } from '@/lib/api.js';
import { EXCLUDED_TYPES, getTypeLabels, pokemonRefsToSpecies } from '@/lib/data.js';
import { englishName, humanize } from '@/lib/format.js';

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
  if (EXCLUDED_TYPES.has(name)) return null;
  return apiJson(`/api/v2/type/${encodeURIComponent(name)}/`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const type = await getType(name);
  return { title: type ? (englishName(type.names) ?? humanize(type.name)) : 'Not found' };
}

export default async function TypePage({ params }) {
  const { name } = await params;
  const type = await getType(name);
  if (!type) notFound();

  const typeLabels = await getTypeLabels();
  const displayName = englishName(type.names) ?? humanize(type.name);
  const pokemon = await pokemonRefsToSpecies(type.pokemon);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>{displayName}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([term, key]) => (
            <div key={key}>
              <dt>{term}</dt>
              <dd>
                {type.damage_relations[key].length === 0 ? (
                  'None'
                ) : (
                  type.damage_relations[key].map((t) => (
                    <TypeBadge
                      key={t.name}
                      name={t.name}
                      label={typeLabels.get(t.name) ?? humanize(t.name)}
                      href={`/types/${t.name}`}
                    />
                  ))
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{pokemon.length} Pokémon</p>
        <ul className="cards">
          {pokemon.map((s) => (
            <PokemonCard key={s.id} id={s.id} speciesName={s.name} />
          ))}
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="plain-list move-list">
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
