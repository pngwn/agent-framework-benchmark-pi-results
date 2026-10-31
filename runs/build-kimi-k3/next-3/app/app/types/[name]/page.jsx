import { cache } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api.js';
import { buildPokemonCards, getTypes } from '../../../lib/data.js';
import { englishName, humanize } from '../../../lib/format.js';
import { NotFound, PokemonCardList, Section } from '../../../lib/components.jsx';

export const dynamic = 'force-dynamic';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

const loadType = cache(async (rawName) => {
  const name = decodeURIComponent(rawName).toLowerCase();
  const valid = (await getTypes()).some((t) => t.name === name);
  if (!valid) return null;
  return apiFetch(`/type/${encodeURIComponent(name)}/`);
});

export async function generateMetadata({ params }) {
  const { name } = await params;
  const type = await loadType(name);
  return { title: type ? englishName(type) : 'Not found' };
}

export default async function TypePage({ params }) {
  const { name } = await params;
  const type = await loadType(name);
  if (!type) return <NotFound />;

  const displayName = englishName(type);
  const typeLabels = Object.fromEntries((await getTypes()).map((t) => [t.name, t.label]));
  const cards = await buildPokemonCards(type.pokemon ?? []);
  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>{displayName}</h1>

      <Section labelledBy="relations-heading" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([term, key]) => {
            const related = type.damage_relations?.[key] ?? [];
            return (
              <div key={key}>
                <dt>{term}</dt>
                <dd>
                  {related.length > 0
                    ? related.map((t) => (
                        <Link key={t.name} href={`/types/${t.name}`} className={`type-badge type-${t.name}`}>
                          {typeLabels[t.name] ?? humanize(t.name)}
                        </Link>
                      ))
                    : 'None'}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section labelledBy="pokemon-heading" title="Pokémon">
        <p className="count-text">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>

      <Section labelledBy="moves-heading" title="Moves">
        <p className="count-text">{moves.length} moves</p>
        <ul className="link-list">
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
