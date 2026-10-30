import { data } from "react-router";
import { NotFoundPage } from "~/components/NotFoundPage";
import { PokemonCardGrid } from "~/components/PokemonCardGrid";
import { fetchApi, getSpeciesMap } from "~/lib/api.server";
import { englishName, englishShortEffect, humanize, idFromUrl } from "~/lib/format";

export async function loader({ params }: { params: { name: string } }) {
  let ability: any;
  try {
    ability = await fetchApi(`/api/v2/ability/${encodeURIComponent(params.name)}`);
  } catch (error: any) {
    if (error?.status === 404) return data({ notFound: true as const }, { status: 404 });
    throw error;
  }

  const speciesByID = await getSpeciesMap();
  const seen = new Set<number>();
  const cards = [];
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (id >= 10000 || seen.has(id)) continue;
    const species = speciesByID.get(id);
    if (!species) continue;
    seen.add(id);
    cards.push({ ...species, hidden: Boolean(entry.is_hidden) });
  }
  cards.sort((a, b) => a.id - b.id);

  return {
    notFound: false as const,
    name: ability.name,
    englishName: englishName(ability.names) ?? humanize(ability.name),
    effect: englishShortEffect(ability.effect_entries) ?? "—",
    pokemon: cards,
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  if (!loaderData || loaderData.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.englishName} – Pokédex` }];
}

export default function AbilityPage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFoundPage />;

  return (
    <>
      <h1>{loaderData.englishName}</h1>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{loaderData.effect}</p>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count-text">{loaderData.pokemon.length} Pokémon</p>
        <PokemonCardGrid pokemon={loaderData.pokemon} showHidden />
      </section>
    </>
  );
}
