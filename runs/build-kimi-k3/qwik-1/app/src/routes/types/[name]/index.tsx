import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { apiFetch } from '../../../lib/api';
import { cardsForPokemonRefs, getTypes } from '../../../lib/data';
import { EM_DASH, englishName, humanize } from '../../../lib/format';
import { CardGrid } from '../../../components/card-grid';
import { NotFound } from '../../../components/not-found';

const RELATIONS: Array<{ term: string; key: string }> = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
];

export const useTypeData = routeLoader$(async ({ params, status }) => {
  const types = await getTypes();
  const typeEn = new Map(types.map((t) => [t.name, t.en]));
  const name = params.name.toLowerCase();
  if (!typeEn.has(name)) {
    status(404);
    return null;
  }
  const record = await apiFetch(`/type/${encodeURIComponent(name)}/`);
  if (!record) {
    status(404);
    return null;
  }

  const relations = RELATIONS.map(({ term, key }) => ({
    term,
    types: (record.damage_relations?.[key] ?? []).map((t: any) => ({
      api: t.name,
      en: typeEn.get(t.name) ?? humanize(t.name),
    })),
  }));

  const cards = await cardsForPokemonRefs(
    (record.pokemon ?? []).map((p: any) => ({ name: p.pokemon.name, url: p.pokemon.url })),
  );

  const moves = (record.moves ?? [])
    .map((m: any) => ({ api: m.name, human: humanize(m.name) }))
    .sort((a: { human: string }, b: { human: string }) => a.human.localeCompare(b.human));

  return {
    enName: englishName(record.names) ?? humanize(record.name),
    relations,
    cards,
    moves,
  };
});

export default component$(() => {
  const data = useTypeData();
  const d = data.value;
  if (!d) return <NotFound />;

  return (
    <>
      <h1>{d.enName}</h1>

      <section class="card" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          {d.relations.map((r) => (
            <div key={r.term}>
              <dt>{r.term}</dt>
              <dd>
                {r.types.length === 0
                  ? 'None'
                  : r.types.map((t) => (
                      <a key={t.api} class={`type-badge type-${t.api}`} href={`/types/${t.api}`}>
                        {t.en}
                      </a>
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{d.cards.length} Pokémon</p>
        <CardGrid cards={d.cards} />
      </section>

      <section class="card" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">{d.moves.length} moves</p>
        <ul class="move-links">
          {d.moves.map((m) => (
            <li key={m.api}>
              <a href={`/moves/${m.api}`}>{m.human}</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const d = resolveValue(useTypeData);
  return { title: d ? `${d.enName} – Pokédex` : 'Not found – Pokédex' };
};
