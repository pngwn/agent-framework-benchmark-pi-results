import { data, Link } from "react-router";
import { apiGet, cardsFromPokemonRefs, getTypes } from "../lib/pokeapi";
import { englishName, humanize } from "../lib/utils";
import { PokemonCardList } from "../components/cards";
import { NotFound } from "../components/not-found";

const RELATIONS: { term: string; key: string }[] = [
  { term: "Super effective against", key: "double_damage_to" },
  { term: "Not very effective against", key: "half_damage_to" },
  { term: "No effect against", key: "no_damage_to" },
  { term: "Weak to", key: "double_damage_from" },
  { term: "Resists", key: "half_damage_from" },
  { term: "Immune to", key: "no_damage_from" },
];

export async function loader({ params }: { params: any }) {
  const name = String(params.name ?? "").toLowerCase();
  const type = await apiGet(`type/${encodeURIComponent(name)}`);
  if (!type) return data(null, { status: 404 });

  // Only the 18 types get a page.
  const valid = new Set((await getTypes()).map((t) => t.name));
  if (!valid.has(type.name)) return data(null, { status: 404 });

  const typeNames = new Map((await getTypes()).map((t) => [t.name, englishName(t)]));
  const displayName = (n: string) => typeNames.get(n) ?? humanize(n);

  const relations = RELATIONS.map((r) => ({
    term: r.term,
    types: (type.damage_relations?.[r.key] ?? []).map((t: any) => ({
      name: t.name,
      display: displayName(t.name),
    })),
  }));

  const cards = await cardsFromPokemonRefs(
    (type.pokemon ?? []).map((p: any) => p.pokemon),
  );

  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name, display: humanize(m.name) }))
    .sort((a: any, b: any) => a.display.localeCompare(b.display));

  return {
    display: englishName(type),
    relations,
    cards,
    moves,
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  return [
    { title: loaderData ? `${loaderData.display} – Pokédex` : "Not found – Pokédex" },
  ];
}

export default function TypePage({ loaderData }: { loaderData: any }) {
  if (!loaderData) return <NotFound />;
  const d = loaderData;

  return (
    <>
      <h1>{d.display}</h1>
      <section aria-labelledby="relations-heading" className="surface section">
        <h2 id="relations-heading">Damage relations</h2>
        <dl className="relations">
          {d.relations.map((r: any) => (
            <div key={r.term} className="relation">
              <dt>{r.term}</dt>
              <dd>
                {r.types.length === 0
                  ? "None"
                  : r.types.map((t: any) => (
                      <Link
                        key={t.name}
                        to={`/types/${t.name}`}
                        className="type-badge-link"
                      >
                        <span
                          className="type-badge"
                          style={{ backgroundColor: `var(--type-${t.name})` }}
                        >
                          {t.display}
                        </span>
                      </Link>
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pokemon-heading" className="surface section">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="result-count">{d.cards.length} Pokémon</p>
        <PokemonCardList cards={d.cards} />
      </section>

      <section aria-labelledby="moves-heading" className="surface section">
        <h2 id="moves-heading">Moves</h2>
        <p className="result-count">{d.moves.length} moves</p>
        <ul className="moves-list">
          {d.moves.map((m: any) => (
            <li key={m.name}>
              <Link to={`/moves/${m.name}`}>{m.display}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
