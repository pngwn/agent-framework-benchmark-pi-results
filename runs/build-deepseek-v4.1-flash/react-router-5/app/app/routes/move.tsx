import { data, Link } from "react-router";
import type { Route } from "./+types/move";
import {
  ApiNotFoundError,
  getAllTypes,
  getResource,
  speciesFromPokemonRefs,
} from "../lib/api.server";
import { englishName, humanize, latestEnglishFlavor } from "../lib/format";
import { NotFound } from "../components/NotFound";
import { PokemonCardGrid } from "../components/PokemonCard";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.notFound ? "Not found" : loaderData?.name ?? "Move";
  return [{ title: `${title} – Pokédex` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  let move: any;
  try {
    move = await getResource("move", params.name);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return data({ notFound: true } as const, { status: 404 });
    }
    throw error;
  }

  const [types, learnedBy] = await Promise.all([
    getAllTypes(),
    speciesFromPokemonRefs(move.learned_by_pokemon),
  ]);
  const typeLabel =
    types.find((entry) => entry.name === move.type?.name)?.label ??
    humanize(move.type?.name ?? "");

  return {
    notFound: false,
    name: englishName(move.names) ?? humanize(move.name),
    typeName: move.type?.name ?? "",
    typeLabel,
    category: humanize(move.damage_class?.name ?? ""),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect:
      englishName(move.effect_entries, "short_effect") ??
      latestEnglishFlavor(move.flavor_text_entries) ??
      "—",
    learnedBy,
  };
}

export default function Move({ loaderData }: Route.ComponentProps) {
  if (loaderData.notFound) return <NotFound />;
  const { name, typeName, typeLabel, category, power, accuracy, pp, effect, learnedBy } =
    loaderData;

  return (
    <div className="page">
      <h1>{name}</h1>

      <dl className="facts detail-facts">
        <div>
          <dt>Type</dt>
          <dd>
            <Link className={`type-badge type-${typeName}`} to={`/types/${typeName}`}>
              {typeLabel}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{power ?? "—"}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{accuracy ?? "—"}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{pp ?? "—"}</dd>
        </div>
      </dl>

      <section className="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p className="effect-text">{effect}</p>
      </section>

      <section className="section" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="section-count">{learnedBy.length} Pokémon</p>
        <PokemonCardGrid pokemon={learnedBy} />
      </section>
    </div>
  );
}
