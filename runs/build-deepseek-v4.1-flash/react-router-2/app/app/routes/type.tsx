import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { NotFoundPage } from "../components/NotFoundPage";
import { PokemonCards } from "../components/PokemonCards";
import { Section } from "../components/Section";
import { TypeBadge } from "../components/TypeBadge";
import { getTypeData } from "../lib/api.server";

export async function loader({ params }: LoaderFunctionArgs) {
  return getTypeData(params.name ?? "");
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData && "notFound" in loaderData ? "Not found – Pokédex" : `${loaderData?.name ?? "Not found"} – Pokédex` },
];

export default function TypeRoute() {
  const data = useLoaderData<typeof loader>();

  if ("notFound" in data) return <NotFoundPage />;

  return (
    <div className="type-page">
      <h1 className="page-title">{data.name}</h1>

      <Section title="Damage relations">
        <dl className="damage-relations">
          {data.relations.map((relation: any) => (
            <div className="relation" key={relation.label}>
              <dt>{relation.label}</dt>
              <dd>
                {relation.types.length ? (
                  relation.types.map((type: any) => (
                    <TypeBadge key={type.name} name={type.name} label={type.english} to={`/types/${type.name}`} small />
                  ))
                ) : (
                  "None"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Pokémon">
        <p className="count">{data.cards.length} Pokémon</p>
        <PokemonCards cards={data.cards} />
      </Section>

      <Section title="Moves">
        <p className="count">{data.moves.length} moves</p>
        <ul className="move-links">
          {data.moves.map((move: any) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.display}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
