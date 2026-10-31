import { data } from "react-router";
import { apiGet, cardsFromPokemonRefs } from "../lib/pokeapi";
import { englishName, englishShortEffect } from "../lib/utils";
import { idFromUrl } from "../lib/utils";
import { PokemonCardList } from "../components/cards";
import { NotFound } from "../components/not-found";

export async function loader({ params }: { params: any }) {
  const ability = await apiGet(
    `ability/${encodeURIComponent(String(params.name ?? "").toLowerCase())}`,
  );
  if (!ability) return data(null, { status: 404 });

  const hiddenById = new Map<number, { hidden: boolean }>();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (Number.isFinite(id)) hiddenById.set(id, { hidden: !!entry.is_hidden });
  }
  const cards = await cardsFromPokemonRefs(
    (ability.pokemon ?? []).map((e: any) => e.pokemon),
    hiddenById,
  );

  return {
    display: englishName(ability),
    effect: englishShortEffect(ability) ?? "—",
    cards,
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  return [
    { title: loaderData ? `${loaderData.display} – Pokédex` : "Not found – Pokédex" },
  ];
}

export default function AbilityPage({ loaderData }: { loaderData: any }) {
  if (!loaderData) return <NotFound />;
  const d = loaderData;

  return (
    <>
      <h1>{d.display}</h1>
      <section aria-labelledby="effect-heading" className="surface section">
        <h2 id="effect-heading">Effect</h2>
        <p>{d.effect}</p>
      </section>

      <section aria-labelledby="pokemon-heading" className="surface section">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="result-count">{d.cards.length} Pokémon</p>
        <PokemonCardList cards={d.cards} />
      </section>
    </>
  );
}
