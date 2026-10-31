import { data } from "react-router";
import { getRecordOrNull, getSpeciesIndex, mediaBase, pokemonRefToSpecies } from "../lib/api.server";
import { EM_DASH, englishName } from "../lib/format";
import { PokemonCardList } from "../components/PokemonCard";
import { Section } from "../components/Section";
import { NotFound } from "../components/NotFound";

export async function loader({ params }: { params: { name?: string } }) {
  const ability = await getRecordOrNull("ability", params.name ?? "");
  if (!ability) return data({ notFound: true as const }, { status: 404 });

  const index = await getSpeciesIndex();
  const bySpecies = new Map<number, { id: number; name: string; hidden: boolean }>();
  for (const entry of ability.pokemon ?? []) {
    const species = pokemonRefToSpecies(entry.pokemon, index);
    if (!species) continue;
    const existing = bySpecies.get(species.id);
    bySpecies.set(species.id, {
      id: species.id,
      name: species.name,
      hidden: (existing?.hidden ?? false) || !!entry.is_hidden,
    });
  }
  const pokemon = [...bySpecies.values()].sort((a, b) => a.id - b.id);

  const shortEffect =
    ability.effect_entries?.find((e: any) => e.language?.name === "en")?.short_effect?.replace(/\s+/g, " ").trim() ||
    null;

  return {
    notFound: false as const,
    title: englishName(ability),
    effect: shortEffect,
    pokemon,
    hiddenBySpecies: Object.fromEntries(pokemon.filter((p) => p.hidden).map((p) => [p.id, "Hidden ability"])),
    spriteBase: mediaBase(),
  };
}

export default function AbilityPage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFound />;
  const d = loaderData;
  const extras = new Map<number, string>(Object.entries(d.hiddenBySpecies).map(([k, v]) => [Number(k), v as string]));
  return (
    <>
      <title>{`${d.title} – Pokédex`}</title>
      <h1>{d.title}</h1>
      <Section title="Effect">
        <p>{d.effect ?? EM_DASH}</p>
      </Section>
      <Section title="Pokémon">
        <p className="count">{d.pokemon.length} Pokémon</p>
        <PokemonCardList species={d.pokemon} spriteBase={d.spriteBase} extras={extras} />
      </Section>
    </>
  );
}
