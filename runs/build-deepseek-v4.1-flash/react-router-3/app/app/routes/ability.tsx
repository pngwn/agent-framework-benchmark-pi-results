import { NotFound } from "../components/NotFound";
import { PokemonCardList } from "../components/ui";
import {
  getResource,
  getSpeciesCardMap,
  refId,
} from "../lib/data.server";
import { displayName, titleFor } from "../lib/format";

export function meta({ loaderData }: any) {
  if (loaderData?.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: titleFor(loaderData?.title) }];
}

export async function loader({ params }: any) {
  const [ability, cardMap] = await Promise.all([
    getResource("ability", params.name),
    getSpeciesCardMap(),
  ]);
  if (!ability) return { notFound: true };

  const cards = new Map<number, any>();
  for (const entry of ability.pokemon ?? []) {
    const id = refId(entry.pokemon);
    if (id === null || id > 10000) continue;
    const card = cardMap.get(id);
    if (!card) continue;
    const existing = cards.get(id);
    cards.set(id, { ...card, hidden: Boolean(existing?.hidden || entry.is_hidden) });
  }

  const effect = ability.effect_entries?.find(
    (entry: any) => entry.language?.name === "en",
  )?.short_effect;

  return {
    notFound: false,
    title: displayName(ability),
    effect: effect ?? "—",
    cards: [...cards.values()].sort((a, b) => a.id - b.id),
  };
}

export default function Ability({ loaderData }: any) {
  if (loaderData.notFound) return <NotFound />;

  return (
    <>
      <h1>{loaderData.title}</h1>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{loaderData.effect}</p>
      </section>

      <section className="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="result-count">{loaderData.cards.length} Pokémon</p>
        <PokemonCardList cards={loaderData.cards} />
      </section>
    </>
  );
}
