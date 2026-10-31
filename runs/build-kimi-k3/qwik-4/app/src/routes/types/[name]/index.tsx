import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFoundContent } from '../../../components/not-found';
import { CardGrid } from '../../../components/pokemon-card';
import { Section } from '../../../components/section';
import { cardsForPokemonRefs, getTypeRecord, getTypes } from '../../../lib/data';
import { humanize } from '../../../lib/util';

const RELATIONS: { key: string; term: string }[] = [
  { key: 'double_damage_to', term: 'Super effective against' },
  { key: 'half_damage_to', term: 'Not very effective against' },
  { key: 'no_damage_to', term: 'No effect against' },
  { key: 'double_damage_from', term: 'Weak to' },
  { key: 'half_damage_from', term: 'Resists' },
  { key: 'no_damage_from', term: 'Immune to' },
];

export const useTypeData = routeLoader$(async (ev) => {
  const name = ev.params.name.toLowerCase();
  const types = await getTypes();
  const info = types.find((t) => t.name === name);
  if (!info) {
    ev.status(404);
    return null;
  }
  const record = await getTypeRecord(name);
  if (!record) {
    ev.status(404);
    return null;
  }
  const labelOf = new Map<string, string>(types.map((t) => [t.name, t.label]));

  const relations = RELATIONS.map(({ key, term }) => ({
    term,
    types: (record.damage_relations?.[key] ?? [])
      .filter((t: any) => labelOf.has(t.name))
      .map((t: any) => ({ name: t.name as string, label: labelOf.get(t.name)! })),
  }));

  const cards = await cardsForPokemonRefs((record.pokemon ?? []).map((p: any) => p.pokemon));

  const moves = (record.moves ?? [])
    .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

  return { heading: info.label, relations, cards, moves };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useTypeData);
  return { title: data ? `${data.heading} – Pokédex` : 'Not found – Pokédex' };
};

export default component$(() => {
  const data = useTypeData();
  const d = data.value;
  if (!d) return <NotFoundContent />;

  return (
    <>
      <h1>{d.heading}</h1>
      <Section title="Damage relations" headingId="relations-heading">
        <dl class="relations">
          {d.relations.map((r) => (
            <div key={r.term} class="relation">
              <dt>{r.term}</dt>
              <dd>
                {r.types.length === 0
                  ? 'None'
                  : r.types.map((t) => (
                      <a key={t.name} class={`type-badge type-${t.name}`} href={`/types/${t.name}`}>
                        {t.label}
                      </a>
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Pokémon" headingId="pokemon-heading">
        <p class="count">{d.cards.length} Pokémon</p>
        <CardGrid cards={d.cards} />
      </Section>

      <Section title="Moves" headingId="moves-heading">
        <p class="count">{d.moves.length} moves</p>
        <ul class="moves-list">
          {d.moves.map((m) => (
            <li key={m.name}>
              <a href={`/moves/${m.name}`}>{m.label}</a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
});
