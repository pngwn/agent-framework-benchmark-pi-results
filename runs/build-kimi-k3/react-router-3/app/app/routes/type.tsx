import { data, Link } from "react-router";
import type { Route } from "./+types/type";
import { EXCLUDED_TYPES, apiGet, isNotFound, pokemonRefsToCards } from "../lib/pokeapi.server";
import { englishName, humanize, type NamedResource } from "../lib/format";
import { NotFound, PokemonCardList, Section } from "../components/ui";

const RELATIONS: { term: string; key: string }[] = [
  { term: "Super effective against", key: "double_damage_to" },
  { term: "Not very effective against", key: "half_damage_to" },
  { term: "No effect against", key: "no_damage_to" },
  { term: "Weak to", key: "double_damage_from" },
  { term: "Resists", key: "half_damage_from" },
  { term: "Immune to", key: "no_damage_from" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const name = decodeURIComponent(params.name).toLowerCase();
  if (EXCLUDED_TYPES.has(name)) return data({ notFound: true as const }, { status: 404 });
  let type: any;
  try {
    type = await apiGet(`/api/v2/type/${name}/`);
  } catch (err) {
    if (isNotFound(err)) return data({ notFound: true as const }, { status: 404 });
    throw err;
  }

  const relations = RELATIONS.map(({ term, key }) => ({
    term,
    types: (type.damage_relations[key] as NamedResource[]).map((t) => ({
      name: t.name,
      english: humanize(t.name),
    })),
  }));

  const pokemon = await pokemonRefsToCards(type.pokemon as any[]);

  const moves = (type.moves as NamedResource[])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return data({ title: englishName(type), relations, pokemon, moves });
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData || "notFound" in loaderData) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.title} – Pokédex` }];
}

export default function TypePage({ loaderData }: Route.ComponentProps) {
  if ("notFound" in loaderData) return <NotFound />;
  const d = loaderData;
  return (
    <>
      <h1>{d.title}</h1>

      <Section title="Damage relations">
        <dl className="damage-relations">
          {d.relations.map((rel) => (
            <div key={rel.term}>
              <dt>{rel.term}</dt>
              <dd>
                {rel.types.length === 0
                  ? "None"
                  : rel.types.map((t, i) => (
                      <span key={t.name}>
                        {i > 0 ? " " : null}
                        <Link to={`/types/${t.name}`} className="type-badge-link">
                          <span
                            className="type-badge"
                            style={{
                              backgroundColor: `var(--type-${t.name}, var(--color-text-muted))`,
                            }}
                          >
                            {t.english}
                          </span>
                        </Link>
                      </span>
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Pokémon">
        <p className="result-count">{d.pokemon.length} Pokémon</p>
        <PokemonCardList cards={d.pokemon} />
      </Section>

      <Section title="Moves">
        <p className="result-count">{d.moves.length} moves</p>
        <ul className="move-link-list">
          {d.moves.map((m) => (
            <li key={m.name}>
              <Link to={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
