import { data, Link } from "react-router";
import type { Route } from "./+types/move";
import { apiGet, isNotFound, pokemonRefsToCards } from "../lib/pokeapi.server";
import { EM_DASH, englishName, humanize, latestEnglishFlavor } from "../lib/format";
import { NotFound, PokemonCardList, Section, TypeBadge } from "../components/ui";

export async function loader({ params }: Route.LoaderArgs) {
  const name = decodeURIComponent(params.name).toLowerCase();
  let move: any;
  try {
    move = await apiGet(`/api/v2/move/${name}/`);
  } catch (err) {
    if (isNotFound(err)) return data({ notFound: true as const }, { status: 404 });
    throw err;
  }

  const shortEffect = (move.effect_entries as any[]).find((e) => e.language.name === "en")
    ?.short_effect;
  const effect = shortEffect ?? latestEnglishFlavor(move.flavor_text_entries) ?? EM_DASH;

  const learnedBy = await pokemonRefsToCards(move.learned_by_pokemon as any[]);

  return data({
    title: englishName(move),
    type: move.type ? { name: move.type.name, english: humanize(move.type.name) } : null,
    category: move.damage_class ? humanize(move.damage_class.name) : EM_DASH,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learnedBy,
  });
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData || "notFound" in loaderData) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.title} – Pokédex` }];
}

const num = (v: number | null) => (v == null ? EM_DASH : String(v));

export default function MovePage({ loaderData }: Route.ComponentProps) {
  if ("notFound" in loaderData) return <NotFound />;
  const d = loaderData;
  return (
    <>
      <h1>{d.title}</h1>
      <dl className="facts move-facts">
        <div>
          <dt>Type</dt>
          <dd>
            {d.type ? (
              <Link to={`/types/${d.type.name}`} className="type-badge-link">
                <TypeBadge name={d.type.name} english={d.type.english} />
              </Link>
            ) : (
              EM_DASH
            )}
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{d.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{num(d.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{num(d.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{num(d.pp)}</dd>
        </div>
      </dl>

      <Section title="Effect">
        <p>{d.effect}</p>
      </Section>

      <Section title="Learned by">
        <p className="result-count">{d.learnedBy.length} Pokémon</p>
        <PokemonCardList cards={d.learnedBy} />
      </Section>
    </>
  );
}
