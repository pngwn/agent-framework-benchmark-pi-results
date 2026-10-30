import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { NotFoundPage } from "../components/NotFoundPage";
import { PokemonCards } from "../components/PokemonCards";
import { Section } from "../components/Section";
import { getAbilityData } from "../lib/api.server";

export async function loader({ params }: LoaderFunctionArgs) {
  return getAbilityData(params.name ?? "");
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData && "notFound" in loaderData ? "Not found – Pokédex" : `${loaderData?.name ?? "Not found"} – Pokédex` },
];

export default function AbilityRoute() {
  const data = useLoaderData<typeof loader>();

  if ("notFound" in data) return <NotFoundPage />;

  return (
    <div className="ability-page">
      <h1 className="page-title">{data.name}</h1>

      <Section title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section title="Pokémon">
        <p className="count">{data.cards.length} Pokémon</p>
        <PokemonCards cards={data.cards} showHidden />
      </Section>
    </div>
  );
}
