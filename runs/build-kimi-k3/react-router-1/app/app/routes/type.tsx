import { data } from "react-router";
import { getRecordOrNull, getSpeciesIndex, mediaBase, pokemonRefToSpecies } from "../lib/api.server";
import { englishName, humanize } from "../lib/format";
import { PokemonCardList } from "../components/PokemonCard";
import { Section } from "../components/Section";
import { NotFound } from "../components/NotFound";
import { TypeBadgeLink } from "../components/TypeBadge";
import { Link } from "react-router";

const RELATIONS: Array<[string, string]> = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
];

export async function loader({ params }: { params: { name?: string } }) {
  const type = await getRecordOrNull("type", params.name ?? "");
  if (!type) return data({ notFound: true as const }, { status: 404 });

  const index = await getSpeciesIndex();
  const bySpecies = new Map<number, { id: number; name: string }>();
  for (const entry of type.pokemon ?? []) {
    const species = pokemonRefToSpecies(entry.pokemon, index);
    if (species && !bySpecies.has(species.id)) bySpecies.set(species.id, species);
  }
  const pokemon = [...bySpecies.values()].sort((a, b) => a.id - b.id);

  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label));

  const relations = RELATIONS.map(([label, key]) => ({
    label,
    types: (type.damage_relations?.[key] ?? []).map((r: any) => ({ name: r.name, label: humanize(r.name) })),
  }));

  return {
    notFound: false as const,
    title: englishName(type),
    relations,
    pokemon,
    moves,
    spriteBase: mediaBase(),
  };
}

export default function TypePage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFound />;
  const d = loaderData;
  return (
    <>
      <title>{`${d.title} – Pokédex`}</title>
      <h1>{d.title}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {d.relations.map((rel: any) => (
            <div key={rel.label} className="relation">
              <dt>{rel.label}</dt>
              <dd>
                {rel.types.length === 0
                  ? "None"
                  : rel.types.map((t: any) => <TypeBadgeLink key={t.name} name={t.name} label={t.label} />)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Pokémon">
        <p className="count">{d.pokemon.length} Pokémon</p>
        <PokemonCardList species={d.pokemon} spriteBase={d.spriteBase} />
      </Section>

      <Section title="Moves">
        <p className="count">{d.moves.length} moves</p>
        <ul className="move-list">
          {d.moves.map((m: any) => (
            <li key={m.name}>
              <Link to={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
