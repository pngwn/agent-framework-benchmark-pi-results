import { data } from "react-router";
import type { Route } from "./+types/move";
import { getMovePage } from "../lib/data.server";
import { CardGrid, NotFound, Section, TypeBadgeLink } from "../components/ui";
import { MISSING } from "../lib/format";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.displayName} – Pokédex` : "Not found – Pokédex" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const page = await getMovePage(params.name);
  if (!page) throw data(null, { status: 404 });
  return page;
}

export function ErrorBoundary() {
  return <NotFound />;
}

export default function Move({ loaderData }: Route.ComponentProps) {
  const page = loaderData;
  return (
    <>
      <h1>{page.displayName}</h1>
      <dl className="fact-list surface">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadgeLink type={page.type} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{page.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{page.power ?? MISSING}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{page.accuracy ?? MISSING}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{page.pp ?? MISSING}</dd>
        </div>
      </dl>

      <Section id="effect" title="Effect">
        <p>{page.effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{page.learnedBy.length} Pokémon</p>
        <CardGrid cards={page.learnedBy} />
      </Section>
    </>
  );
}
