import { data, Link } from 'react-router';
import { apiBase, getTypeData, speciesCards } from '../lib/api.server.js';
import { humanize } from '../lib/util.js';
import { CardList, Section } from '../lib/components.jsx';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function loader({ params }) {
  const typeData = await getTypeData();
  const entry = typeData.byName.get(params.name);
  if (!entry) throw data('Not Found', { status: 404 });
  const record = entry.record;

  const enOf = (name) => typeData.byName.get(name)?.en ?? humanize(name);
  const relations = RELATIONS.map(([term, key]) => ({
    term,
    types: (record.damage_relations?.[key] ?? []).map((t) => ({ name: t.name, en: enOf(t.name) })),
  }));

  const cards = await speciesCards(record.pokemon ?? []);
  const moves = (record.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { apiBase, name: entry.en, relations, cards, moves };
}

export function meta({ loaderData }) {
  return [{ title: `${loaderData.name} – Pokédex` }];
}

export default function TypePage({ loaderData }) {
  const d = loaderData;
  return (
    <>
      <h1>{d.name}</h1>
      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {d.relations.map((r) => (
            <div key={r.term} className="relation">
              <dt>{r.term}</dt>
              <dd>
                {r.types.length
                  ? r.types.map((t) => (
                      <Link
                        key={t.name}
                        to={`/types/${t.name}`}
                        className={`type-badge type-${t.name}`}
                      >
                        {t.en}
                      </Link>
                    ))
                  : 'None'}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{d.cards.length} Pokémon</p>
        <CardList apiBase={d.apiBase} items={d.cards} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{d.moves.length} moves</p>
        <ul className="move-list">
          {d.moves.map((m) => (
            <li key={m.name}>
              <Link to={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
