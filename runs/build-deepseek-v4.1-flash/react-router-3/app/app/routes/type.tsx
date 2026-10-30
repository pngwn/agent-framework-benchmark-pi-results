import { Link } from "react-router";
import { NotFound } from "../components/NotFound";
import { PokemonCardList } from "../components/ui";
import {
  cardsFromRefs,
  getResource,
  getTypeDisplayMap,
  getTypeEntries,
} from "../lib/data.server";
import { displayName, humanize, titleFor } from "../lib/format";

export function meta({ loaderData }: any) {
  if (loaderData?.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: titleFor(loaderData?.title) }];
}

const RELATIONS = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
];

export async function loader({ params }: any) {
  const [type, typeEntries] = await Promise.all([
    getResource("type", params.name),
    getTypeEntries(),
  ]);
  if (!type) return { notFound: true };

  const typeNames = getTypeDisplayMap(typeEntries);
  const relationRefs = type.damage_relations ?? {};
  const relations = RELATIONS.map(([label, key]) => ({
    label,
    types: (relationRefs[key] ?? []).map((ref: any) => ({
      name: ref.name,
      displayName: typeNames.get(ref.name) ?? humanize(ref.name),
    })),
  }));

  const cards = await cardsFromRefs(
    (type.pokemon ?? []).map((entry: any) => entry.pokemon),
  );
  const moves = (type.moves ?? [])
    .map((move: any) => ({ name: move.name, displayName: humanize(move.name) }))
    .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));

  return {
    notFound: false,
    title: displayName(type),
    relations,
    cards,
    moves,
  };
}

export default function Type({ loaderData }: any) {
  if (loaderData.notFound) return <NotFound />;

  return (
    <>
      <h1>{loaderData.title}</h1>

      <section className="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl className="relations">
          {loaderData.relations.map((relation: any) => (
            <div className="relation" key={relation.label}>
              <dt>{relation.label}</dt>
              <dd>
                {relation.types.length ? (
                  relation.types.map((type: any) => (
                    <Link
                      key={type.name}
                      className={`type-badge type-${type.name}`}
                      to={`/types/${type.name}`}
                    >
                      {type.displayName}
                    </Link>
                  ))
                ) : (
                  "None"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="result-count">{loaderData.cards.length} Pokémon</p>
        <PokemonCardList cards={loaderData.cards} />
      </section>

      <section className="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p className="result-count">{loaderData.moves.length} moves</p>
        <ul className="link-grid">
          {loaderData.moves.map((move: any) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.displayName}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
