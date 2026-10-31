import { data, Link } from "react-router";
import { apiGet, cardsFromPokemonRefs, getTypeNameMap, typeDisplayName } from "../lib/pokeapi";
import { englishName, englishShortEffect, humanize, latestEnglishFlavor } from "../lib/utils";
import { PokemonCardList } from "../components/cards";
import { NotFound } from "../components/not-found";

export async function loader({ params }: { params: any }) {
  const move = await apiGet(`move/${encodeURIComponent(String(params.name ?? "").toLowerCase())}`);
  if (!move) return data(null, { status: 404 });

  const typeNames = await getTypeNameMap();
  const cards = await cardsFromPokemonRefs(move.learned_by_pokemon ?? []);

  return {
    display: englishName(move),
    type: move.type
      ? { name: move.type.name, display: typeDisplayName(typeNames, move.type.name) }
      : null,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : "—",
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: englishShortEffect(move) ?? latestEnglishFlavor(move) ?? "—",
    cards,
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  return [
    { title: loaderData ? `${loaderData.display} – Pokédex` : "Not found – Pokédex" },
  ];
}

export default function MovePage({ loaderData }: { loaderData: any }) {
  if (!loaderData) return <NotFound />;
  const d = loaderData;
  const num = (v: number | null) => (v == null ? "—" : String(v));

  return (
    <>
      <h1>{d.display}</h1>
      <dl className="facts surface">
        <div>
          <dt>Type</dt>
          <dd>
            {d.type ? (
              <Link to={`/types/${d.type.name}`} className="type-badge-link">
                <span className="type-badge" style={{ backgroundColor: `var(--type-${d.type.name})` }}>
                  {d.type.display}
                </span>
              </Link>
            ) : (
              "—"
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

      <section aria-labelledby="effect-heading" className="surface section">
        <h2 id="effect-heading">Effect</h2>
        <p>{d.effect}</p>
      </section>

      <section aria-labelledby="learnedby-heading" className="surface section">
        <h2 id="learnedby-heading">Learned by</h2>
        <p className="result-count">{d.cards.length} Pokémon</p>
        <PokemonCardList cards={d.cards} />
      </section>
    </>
  );
}
