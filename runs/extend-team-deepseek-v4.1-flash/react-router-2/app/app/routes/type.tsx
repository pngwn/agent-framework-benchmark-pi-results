import { data, Link } from "react-router";
import type { Route } from "./+types/type";
import { apiOr404, getIndex, pokemonCards, typeInfo, type TypeRecord } from "../lib/api.server";
import { englishName, humanize, pageTitle } from "../lib/format";
import { Section } from "../components/Section";
import { TypeBadges } from "../components/TypeBadge";
import { PokemonCards } from "../components/PokemonCards";

const RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
] as const;

export async function loader({ params }: Route.LoaderArgs) {
  const index = await getIndex();
  const name = params.name.toLowerCase();
  // Only the 18 battle types have pages.
  if (!index.types.some((t) => t.name === name)) throw data("Not found", { status: 404 });
  const type = await apiOr404<TypeRecord>(`type/${encodeURIComponent(name)}`);
  return {
    label: englishName(type.names, type.name),
    relations: RELATIONS.map(([key, label]) => ({
      key,
      label,
      types: (type.damage_relations[key] ?? []).map((t) => typeInfo(index, t.name)),
    })),
    pokemon: pokemonCards(
      index,
      type.pokemon.map((p) => p.pokemon),
    ),
    moves: type.moves
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export default function TypePage({ loaderData: d }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(d.label)}</title>
      <h1>{d.label}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {d.relations.map((r) => (
            <div key={r.key}>
              <dt>{r.label}</dt>
              <dd>{r.types.length ? <TypeBadges types={r.types} link /> : "None"}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Pokémon">
        <p className="count">{d.pokemon.length} Pokémon</p>
        <PokemonCards cards={d.pokemon} />
      </Section>
      <Section title="Moves">
        <p className="count">{d.moves.length} moves</p>
        <ul className="move-columns">
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
