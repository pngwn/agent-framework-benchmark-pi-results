import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFound } from '~/components/not-found';
import { PokemonCardList } from '~/components/pokemon-card';
import { Section } from '~/components/section';
import { TypeBadge } from '~/components/type-badge';
import { apiOrNull } from '~/lib/api';
import { cardsForPokemonRefs, EXCLUDED_TYPES, getTypeList } from '~/lib/data';
import { englishName, humanize } from '~/lib/format';

const RELATIONS: { term: string; key: string }[] = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
];

export const useType = routeLoader$(async (ev) => {
  const name = decodeURIComponent(ev.params.name).toLowerCase();
  if (EXCLUDED_TYPES.has(name)) {
    ev.status(404);
    return null;
  }
  const type = await apiOrNull(`/type/${encodeURIComponent(name)}/`);
  if (!type) {
    ev.status(404);
    return null;
  }
  const [typeList, pokemon] = await Promise.all([
    getTypeList(),
    cardsForPokemonRefs(type.pokemon as any[]),
  ]);
  const typeEnglish = new Map(typeList.map((t) => [t.name, t.english]));

  const relations = RELATIONS.map(({ term, key }) => ({
    term,
    types: ((type.damage_relations[key] as any[]) ?? [])
      .filter((t) => !EXCLUDED_TYPES.has(t.name))
      .map((t) => ({
        name: t.name as string,
        english: typeEnglish.get(t.name) ?? humanize(t.name),
      })),
  }));

  const moves = (type.moves as any[])
    .map((m) => ({ name: m.name as string, human: humanize(m.name) }))
    .sort((a, b) => a.human.localeCompare(b.human));

  return {
    english: englishName(type.names, type.name),
    relations,
    pokemon,
    moves,
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useType);
  return {
    title: data ? `${data.english} – Pokédex` : 'Not found – Pokédex',
  };
};

export default component$(() => {
  const data = useType().value;
  if (!data) return <NotFound />;

  return (
    <>
      <h1>{data.english}</h1>
      <Section headingId="damage-relations-heading" title="Damage relations">
        <dl class="relations">
          {data.relations.map((r) => (
            <div key={r.term}>
              <dt>{r.term}</dt>
              <dd>
                {r.types.length === 0 ? (
                  'None'
                ) : (
                  <span class="relation-badges">
                    {r.types.map((t) => (
                      <TypeBadge key={t.name} name={t.name} english={t.english} link />
                    ))}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section headingId="pokemon-heading" title="Pokémon">
        <p class="count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </Section>

      <Section headingId="moves-heading" title="Moves">
        <p class="count">{data.moves.length} moves</p>
        <ul class="move-list">
          {data.moves.map((m) => (
            <li key={m.name}>
              <a href={`/moves/${m.name}`}>{m.human}</a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
});
