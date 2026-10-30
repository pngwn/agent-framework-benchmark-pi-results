import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  englishName,
  getRecord,
  getTypeLabelMap,
  humanize,
  speciesCardsFromRefs,
  typeLabelFor,
} from "../../../lib/data";
import { NotFound } from "../../../components/not-found";
import { PokemonCard } from "../../../components/ui";

const RELATIONS: { term: string; key: string }[] = [
  { term: "Super effective against", key: "double_damage_to" },
  { term: "Not very effective against", key: "half_damage_to" },
  { term: "No effect against", key: "no_damage_to" },
  { term: "Weak to", key: "double_damage_from" },
  { term: "Resists", key: "half_damage_from" },
  { term: "Immune to", key: "no_damage_from" },
];

export const useTypeData = routeLoader$(async ({ params }) => {
  const type = await getRecord("type", params.name);
  if (!type) return { notFound: true as const };

  const [typeLabels, pokemon] = await Promise.all([
    getTypeLabelMap(),
    speciesCardsFromRefs((type.pokemon ?? []).map((entry: any) => entry.pokemon)),
  ]);

  const relations = RELATIONS.map((relation) => ({
    term: relation.term,
    types: (type.damage_relations?.[relation.key] ?? []).map((entry: any) => {
      const name = String(entry.name ?? "");
      return { name, label: typeLabelFor(typeLabels, name) };
    }),
  }));
  const moves = (type.moves ?? [])
    .map((entry: any) => ({ name: String(entry.name), label: humanize(String(entry.name)) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

  return {
    notFound: false as const,
    englishName: englishName(type),
    relations,
    pokemon,
    moves,
  };
});

export default component$(() => {
  const data = useTypeData();
  if (data.value.notFound) return <NotFound />;
  const type = data.value;

  return (
    <>
      <h1>{type.englishName}</h1>

      <section class="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="relations">
          {type.relations.map((relation) => (
            <div class="relation" key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length === 0
                  ? "None"
                  : relation.types.map((related: { name: string; label: string }) => (
                      <a
                        key={related.name}
                        class={`type-badge type-${related.name}`}
                        href={`/types/${related.name}`}
                      >
                        {related.label}
                      </a>
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="panel" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p class="count">{type.pokemon.length} Pokémon</p>
        <ul class="card-grid">
          {type.pokemon.map((card: { id: number; name: string; hidden: boolean; sprite: string | null }) => (
            <PokemonCard key={card.id} card={card} />
          ))}
        </ul>
      </section>

      <section class="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p class="count">{type.moves.length} moves</p>
        <ul class="move-links">
          {type.moves.map((move: { name: string; label: string }) => (
            <li key={move.name}>
              <a href={`/moves/${move.name}`}>{move.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useTypeData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.englishName} – Pokédex` };
};
