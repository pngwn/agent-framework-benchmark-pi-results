import { data } from "react-router";
import { NotFoundPage } from "~/components/NotFoundPage";
import { PokemonCardGrid } from "~/components/PokemonCardGrid";
import { TypeBadge } from "~/components/TypeBadge";
import { fetchApi, getSpeciesMap } from "~/lib/api.server";
import {
  displayValue,
  englishName,
  englishShortEffect,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from "~/lib/format";

export async function loader({ params }: { params: { name: string } }) {
  let move: any;
  try {
    move = await fetchApi(`/api/v2/move/${encodeURIComponent(params.name)}`);
  } catch (error: any) {
    if (error?.status === 404) return data({ notFound: true as const }, { status: 404 });
    throw error;
  }

  const speciesByID = await getSpeciesMap();
  const seen = new Set<number>();
  const cards = [];
  for (const ref of move.learned_by_pokemon ?? []) {
    const id = idFromUrl(ref.url);
    if (id >= 10000 || seen.has(id)) continue;
    const species = speciesByID.get(id);
    if (!species) continue;
    seen.add(id);
    cards.push(species);
  }
  cards.sort((a, b) => a.id - b.id);

  const shortEffect = englishShortEffect(move.effect_entries);
  const effect = shortEffect || latestEnglishFlavor(move.flavor_text_entries) || "—";

  return {
    notFound: false as const,
    name: move.name,
    englishName: englishName(move.names) ?? humanize(move.name),
    type: { name: move.type.name, label: humanize(move.type.name) },
    category: humanize(move.damage_class.name),
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    learnedBy: cards,
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  if (!loaderData || loaderData.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.englishName} – Pokédex` }];
}

export default function MovePage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFoundPage />;

  return (
    <>
      <h1>{loaderData.englishName}</h1>
      <dl className="detail-facts">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge name={loaderData.type.name} label={loaderData.type.label} link />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{loaderData.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{displayValue(loaderData.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{displayValue(loaderData.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{displayValue(loaderData.pp)}</dd>
        </div>
      </dl>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{loaderData.effect}</p>
      </section>

      <section className="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="count-text">{loaderData.learnedBy.length} Pokémon</p>
        <PokemonCardGrid pokemon={loaderData.learnedBy} />
      </section>
    </>
  );
}
