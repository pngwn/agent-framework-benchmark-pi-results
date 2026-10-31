import { data } from "react-router";
import type { Route } from "./+types/ability";
import { getAbilityPage } from "../lib/data.server";
import { CardGrid, NotFound, Section } from "../components/ui";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.displayName} – Pokédex` : "Not found – Pokédex" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const page = await getAbilityPage(params.name);
  if (!page) throw data(null, { status: 404 });
  return page;
}

export function ErrorBoundary() {
  return <NotFound />;
}

export default function Ability({ loaderData }: Route.ComponentProps) {
  const page = loaderData;
  return (
    <>
      <h1>{page.displayName}</h1>
      <Section id="effect" title="Effect">
        <p>{page.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{page.cards.length} Pokémon</p>
        <CardGrid cards={page.cards} />
      </Section>
    </>
  );
}
