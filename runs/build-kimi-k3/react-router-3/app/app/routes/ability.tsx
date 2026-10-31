import { data } from "react-router";
import type { Route } from "./+types/ability";
import { apiGet, isNotFound, pokemonRefsToCards } from "../lib/pokeapi.server";
import { EM_DASH, englishName } from "../lib/format";
import { NotFound, PokemonCardList, Section } from "../components/ui";

export async function loader({ params }: Route.LoaderArgs) {
  const name = decodeURIComponent(params.name).toLowerCase();
  let ability: any;
  try {
    ability = await apiGet(`/api/v2/ability/${name}/`);
  } catch (err) {
    if (isNotFound(err)) return data({ notFound: true as const }, { status: 404 });
    throw err;
  }

  const effect =
    (ability.effect_entries as any[]).find((e) => e.language.name === "en")?.short_effect ?? EM_DASH;

  const pokemon = await pokemonRefsToCards(ability.pokemon as any[]);

  return data({ title: englishName(ability), effect, pokemon });
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData || "notFound" in loaderData) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.title} – Pokédex` }];
}

export default function AbilityPage({ loaderData }: Route.ComponentProps) {
  if ("notFound" in loaderData) return <NotFound />;
  const d = loaderData;
  return (
    <>
      <h1>{d.title}</h1>
      <Section title="Effect">
        <p>{d.effect}</p>
      </Section>
      <Section title="Pokémon">
        <p className="result-count">{d.pokemon.length} Pokémon</p>
        <PokemonCardList cards={d.pokemon} />
      </Section>
    </>
  );
}
