import { data, Link } from "react-router";
import { NotFoundPage } from "~/components/NotFoundPage";
import { PokemonCardGrid } from "~/components/PokemonCardGrid";
import { TypeBadge } from "~/components/TypeBadge";
import { fetchApi, getSpeciesMap } from "~/lib/api.server";
import { humanize, idFromUrl } from "~/lib/format";

const RELATIONS = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
] as const;

export async function loader({ params }: { params: { name: string } }) {
  let type: any;
  try {
    type = await fetchApi(`/api/v2/type/${encodeURIComponent(params.name)}`);
  } catch (error: any) {
    if (error?.status === 404) return data({ notFound: true as const }, { status: 404 });
    throw error;
  }

  const speciesByID = await getSpeciesMap();
  const seen = new Set<number>();
  const cards = [];
  for (const entry of type.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (id >= 10000 || seen.has(id)) continue;
    const species = speciesByID.get(id);
    if (!species) continue;
    seen.add(id);
    cards.push(species);
  }
  cards.sort((a, b) => a.id - b.id);

  const relations = RELATIONS.map(([term, key]) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map((relation: any) => ({
      name: relation.name,
      label: humanize(relation.name),
    })),
  }));

  const moves = [...(type.moves ?? [])]
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((move: any) => ({ name: move.name, label: humanize(move.name) }));

  return {
    notFound: false as const,
    name: type.name,
    englishName: humanize(type.name),
    relations,
    pokemon: cards,
    moves,
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  if (!loaderData || loaderData.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.englishName} – Pokédex` }];
}

export default function TypePage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFoundPage />;

  return (
    <>
      <h1>{loaderData.englishName}</h1>

      <section className="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl className="damage-relations">
          {loaderData.relations.map((relation: any) => (
            <div className="relation" key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length
                  ? relation.types.map((type: any) => (
                      <TypeBadge key={type.name} name={type.name} label={type.label} link />
                    ))
                  : "None"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count-text">{loaderData.pokemon.length} Pokémon</p>
        <PokemonCardGrid pokemon={loaderData.pokemon} />
      </section>

      <section className="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p className="count-text">{loaderData.moves.length} moves</p>
        <ul className="move-links">
          {loaderData.moves.map((move: any) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
