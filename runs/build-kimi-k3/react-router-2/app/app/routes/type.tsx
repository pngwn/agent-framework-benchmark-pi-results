import { Link, data } from "react-router";
import type { Route } from "./+types/type";
import { getTypePage } from "../lib/data.server";
import { CardGrid, NotFound, Section, TypeBadgeLink } from "../components/ui";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.displayName} – Pokédex` : "Not found – Pokédex" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const page = await getTypePage(params.name);
  if (!page) throw data(null, { status: 404 });
  return page;
}

export function ErrorBoundary() {
  return <NotFound />;
}

export default function Type({ loaderData }: Route.ComponentProps) {
  const page = loaderData;
  return (
    <>
      <h1>{page.displayName}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {page.relations.map((relation) => (
            <div key={relation.term} className="relation">
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length === 0
                  ? "None"
                  : relation.types.map((t: any) => <TypeBadgeLink key={t.name} type={t} />)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{page.cards.length} Pokémon</p>
        <CardGrid cards={page.cards} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{page.moves.length} moves</p>
        <ul className="move-list">
          {page.moves.map((move: any) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
