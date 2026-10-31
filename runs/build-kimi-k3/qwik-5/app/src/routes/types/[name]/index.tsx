import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import {
  apiGet,
  getSpeciesNameById,
  getTypeIndex,
  idFromUrl,
  isDefaultPokemonId,
  spriteUrl,
} from '../../../lib/api';
import { englishName, humanize } from '../../../lib/format';
import { NotFound } from '../../../components/not-found';
import { PokemonCards, type CardData } from '../../../components/pokemon-cards';

const RELATIONS: { term: string; key: string }[] = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
];

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export const useTypeData = routeLoader$(async ({ params, status }) => {
  const name = params.name.toLowerCase();
  if (EXCLUDED_TYPES.has(name)) {
    status(404);
    return null;
  }
  const type = await apiGet(`type/${encodeURIComponent(name)}/`);
  if (!type) {
    status(404);
    return null;
  }

  const [typeIndex, speciesById] = await Promise.all([getTypeIndex(), getSpeciesNameById()]);

  const relations = RELATIONS.map(({ term, key }) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map((t: any) => ({
      name: t.name as string,
      label: typeIndex.byName.get(t.name)?.label ?? humanize(t.name),
    })),
  }));

  // Pokémon of this type; alternate forms are excluded.
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const entry of type.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url ?? '');
    if (!isDefaultPokemonId(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  ids.sort((a, b) => a - b);

  const cards: CardData[] = ids
    .filter((id) => speciesById.has(id))
    .map((id) => ({ name: speciesById.get(id)!, id, sprite: spriteUrl(id) }));

  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

  return {
    name: englishName(type.names) ?? humanize(type.name),
    relations,
    cards,
    moves,
  };
});

export default component$(() => {
  const data = useTypeData();
  if (!data.value) {
    return <NotFound />;
  }
  const d = data.value;

  return (
    <>
      <h1>{d.name}</h1>

      <section class="card-section" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations-grid">
          {d.relations.map((rel) => (
            <div key={rel.term}>
              <dt>{rel.term}</dt>
              <dd>
                {rel.types.length === 0
                  ? 'None'
                  : rel.types.map((t) => (
                      <a key={t.name} class="type-badge" data-type={t.name} href={`/types/${t.name}`}>
                        {t.label}
                      </a>
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="card-section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count-text">{d.cards.length} Pokémon</p>
        <PokemonCards cards={d.cards} />
      </section>

      <section class="card-section" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count-text">{d.moves.length} moves</p>
        <ul class="move-links">
          {d.moves.map((m) => (
            <li key={m.name}>
              <a href={`/moves/${m.name}`}>{m.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useTypeData);
  return {
    title: data ? `${data.name} – Pokédex` : 'Not found – Pokédex',
  };
};
