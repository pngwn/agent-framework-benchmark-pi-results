import { data, Link } from "react-router";
import type { Route } from "./+types/type";
import {
  ApiNotFoundError,
  getAllTypes,
  getResource,
  speciesFromPokemonRefs,
} from "../lib/api.server";
import { englishName, humanize } from "../lib/format";
import { NotFound } from "../components/NotFound";
import { PokemonCardGrid } from "../components/PokemonCard";

const RELATIONS = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
] as const;

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.notFound ? "Not found" : loaderData?.name ?? "Type";
  return [{ title: `${title} – Pokédex` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  let type: any;
  try {
    type = await getResource("type", params.name);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return data({ notFound: true } as const, { status: 404 });
    }
    throw error;
  }

  const allTypes = await getAllTypes();
  const labels = new Map(allTypes.map((entry) => [entry.name, entry.label]));
  const labelFor = (name: string) => labels.get(name) ?? humanize(name);

  const relations = RELATIONS.map(([term, key]) => ({
    term,
    types: ((type.damage_relations?.[key] ?? []) as { name: string }[]).map((entry) => ({
      name: entry.name,
      label: labelFor(entry.name),
    })),
  }));

  const pokemon = await speciesFromPokemonRefs(
    (type.pokemon ?? []).map((entry: any) => entry.pokemon),
  );
  const moves = [...(type.moves ?? [])]
    .map((entry: any) => ({ name: entry.name, label: humanize(entry.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    notFound: false,
    name: englishName(type.names) ?? humanize(type.name),
    relations,
    pokemon,
    moves,
  };
}

export default function TypePage({ loaderData }: Route.ComponentProps) {
  if (loaderData.notFound) return <NotFound />;
  const { name, relations, pokemon, moves } = loaderData;

  return (
    <div className="page">
      <h1>{name}</h1>

      <section className="section" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl className="damage-relations">
          {relations.map((relation) => (
            <div className="relation" key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length === 0 ? (
                  "None"
                ) : (
                  relation.types.map((type) => (
                    <Link
                      key={type.name}
                      className={`type-badge type-${type.name}`}
                      to={`/types/${type.name}`}
                    >
                      {type.label}
                    </Link>
                  ))
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p className="section-count">{pokemon.length} Pokémon</p>
        <PokemonCardGrid pokemon={pokemon} />
      </section>

      <section className="section" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p className="section-count">{moves.length} moves</p>
        <ul className="move-link-grid">
          {moves.map((move) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
