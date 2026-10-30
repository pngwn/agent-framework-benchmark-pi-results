import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFoundContent, PokemonCards, TypeLink } from "../../../components/ui";
import {
  cardsFromRefs,
  getSpeciesIndex,
  getTypeCatalog,
  getTypeRecord,
} from "../../../lib/api";
import { englishName, humanize } from "../../../lib/format";

const RELATIONS: { key: string; label: string }[] = [
  { key: "double_damage_to", label: "Super effective against" },
  { key: "half_damage_to", label: "Not very effective against" },
  { key: "no_damage_to", label: "No effect against" },
  { key: "double_damage_from", label: "Weak to" },
  { key: "half_damage_from", label: "Resists" },
  { key: "no_damage_from", label: "Immune to" },
];

export const useTypeData = routeLoader$(async ({ params }) => {
  const [record, catalog, speciesIndex] = await Promise.all([
    getTypeRecord(params.name),
    getTypeCatalog(),
    getSpeciesIndex(),
  ]);
  const allowed = record
    ? catalog.types.some((type) => type.name === record.name)
    : false;
  if (!record || !allowed) {
    return { notFound: true as const };
  }

  const englishByType = new Map(catalog.types.map((type) => [type.name, type.english]));
  const relations = RELATIONS.map(({ key, label }) => ({
    label,
    types: (record.damage_relations[key] ?? []).map((type) => ({
      name: type.name,
      english: englishByType.get(type.name) ?? humanize(type.name),
    })),
  }));

  const cards = cardsFromRefs(
    record.pokemon.map((entry) => entry.pokemon),
    speciesIndex,
  );

  const moves = record.moves
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    notFound: false as const,
    name: record.name,
    title: englishName(record.names, record.name),
    relations,
    cards,
    moves,
  };
});

export default component$(() => {
  const data = useTypeData();
  if (data.value.notFound) return <NotFoundContent />;

  return (
    <>
      <h1>{data.value.title}</h1>

      <section class="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="relations-list">
          {data.value.relations.map((relation) => (
            <div key={relation.label}>
              <dt>{relation.label}</dt>
              <dd>
                {relation.types.length ? (
                  relation.types.map((type) => (
                    <TypeLink key={type.name} name={type.name} label={type.english} />
                  ))
                ) : (
                  "None"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="panel" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p class="result-count">{data.value.cards.length} Pokémon</p>
        <PokemonCards cards={data.value.cards} />
      </section>

      <section class="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p class="result-count">{data.value.moves.length} moves</p>
        <ul class="link-grid">
          {data.value.moves.map((move) => (
            <li key={move.name}>
              <Link href={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useTypeData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.title} – Pokédex` };
};
