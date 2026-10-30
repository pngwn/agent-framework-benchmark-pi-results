import { NotFound } from "../components/NotFound";
import { PokemonCardList, TypeBadge } from "../components/ui";
import {
  cardsFromRefs,
  getResource,
  getTypeDisplayMap,
  getTypeEntries,
} from "../lib/data.server";
import {
  displayName,
  humanize,
  latestEnglishFlavorText,
  orDash,
  titleFor,
} from "../lib/format";

export function meta({ loaderData }: any) {
  if (loaderData?.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: titleFor(loaderData?.title) }];
}

export async function loader({ params }: any) {
  const [move, typeEntries] = await Promise.all([
    getResource("move", params.name),
    getTypeEntries(),
  ]);
  if (!move) return { notFound: true };

  const cards = await cardsFromRefs(move.learned_by_pokemon);
  const typeNames = getTypeDisplayMap(typeEntries);
  const shortEffect = move.effect_entries?.find(
    (entry: any) => entry.language?.name === "en",
  )?.short_effect;

  return {
    notFound: false,
    title: displayName(move),
    type: {
      name: move.type?.name ?? "",
      displayName: typeNames.get(move.type?.name) ?? humanize(move.type?.name),
    },
    category: humanize(move.damage_class?.name),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect:
      shortEffect ??
      latestEnglishFlavorText(move.flavor_text_entries) ??
      "—",
    cards,
  };
}

export default function Move({ loaderData }: any) {
  if (loaderData.notFound) return <NotFound />;

  return (
    <>
      <h1>{loaderData.title}</h1>

      <div className="panel move-facts-panel">
        <dl className="move-facts">
          <div>
            <dt>Type</dt>
            <dd>
              <TypeBadge
                name={loaderData.type.name}
                label={loaderData.type.displayName}
                link
              />
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{loaderData.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{orDash(loaderData.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{orDash(loaderData.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{orDash(loaderData.pp)}</dd>
          </div>
        </dl>
      </div>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{loaderData.effect}</p>
      </section>

      <section className="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="result-count">{loaderData.cards.length} Pokémon</p>
        <PokemonCardList cards={loaderData.cards} />
      </section>
    </>
  );
}
