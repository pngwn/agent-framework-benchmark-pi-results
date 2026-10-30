import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { NotFoundPage } from "../components/NotFoundPage";
import { PokemonCards } from "../components/PokemonCards";
import { Section } from "../components/Section";
import { TypeBadge } from "../components/TypeBadge";
import { getMoveData } from "../lib/api.server";
import { displayMissing } from "../lib/format";

export async function loader({ params }: LoaderFunctionArgs) {
  return getMoveData(params.name ?? "");
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData && "notFound" in loaderData ? "Not found – Pokédex" : `${loaderData?.name ?? "Not found"} – Pokédex` },
];

export default function MoveRoute() {
  const data = useLoaderData<typeof loader>();

  if ("notFound" in data) return <NotFoundPage />;

  return (
    <div className="move-page">
      <h1 className="page-title">{data.name}</h1>

      <div className="summary-card">
        <dl className="summary-list">
          <div>
            <dt>Type</dt>
            <dd>
              <TypeBadge name={data.type.name} label={data.type.english} to={`/types/${data.type.name}`} />
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{displayMissing(data.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{displayMissing(data.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{displayMissing(data.pp)}</dd>
          </div>
        </dl>
      </div>

      <Section title="Effect">
        <p className="prose">{data.effect}</p>
      </Section>

      <Section title="Learned by">
        <p className="count">{data.cards.length} Pokémon</p>
        <PokemonCards cards={data.cards} />
      </Section>
    </div>
  );
}
