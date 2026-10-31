import Link from 'next/link';
import { getType, isPlayableTypeName, pokemonCardsFromRefs } from '../../../lib/api.js';
import { humanize } from '../../../lib/format.js';
import { NotFound } from '../../components/NotFound.jsx';
import { Section } from '../../components/Section.jsx';
import { PokemonCardList } from '../../components/PokemonCard.jsx';

export const dynamic = 'force-dynamic';

async function loadType(name) {
  const lower = String(name).toLowerCase();
  if (!isPlayableTypeName(lower)) return null;
  return getType(lower);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const type = await loadType(name);
  return { title: type ? humanize(type.name) : 'Not found' };
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
  const type = await loadType(name);
  if (!type) return <NotFound />;

  const cards = await pokemonCardsFromRefs((type.pokemon ?? []).map((entry) => entry.pokemon));
  const moves = [...(type.moves ?? [])].sort((a, b) => humanize(a.name).localeCompare(humanize(b.name)));

  return (
    <>
      <h1>{humanize(type.name)}</h1>

      <Section heading="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([term, key]) => (
            <div key={key}>
              <dt>{term}</dt>
              <dd>
                {type.damage_relations[key].length ? (
                  type.damage_relations[key].map((t) => (
                    <Link key={t.name} className={`type-badge type-${t.name}`} href={`/types/${t.name}`}>
                      {humanize(t.name)}
                    </Link>
                  ))
                ) : (
                  'None'
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section heading="Pokémon">
        <p className="result-count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} />
      </Section>

      <Section heading="Moves">
        <p className="result-count">{moves.length} moves</p>
        <ul className="move-list">
          {moves.map((m) => (
            <li key={m.name}>
              <Link href={`/moves/${m.name}`}>{humanize(m.name)}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
