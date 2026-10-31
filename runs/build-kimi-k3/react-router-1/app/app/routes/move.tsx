import { data, Link } from "react-router";
import { getRecordOrNull, getSpeciesIndex, mediaBase, pokemonRefToSpecies } from "../lib/api.server";
import { EM_DASH, englishName, humanize, latestEnglishFlavor } from "../lib/format";
import { PokemonCardList } from "../components/PokemonCard";
import { Section } from "../components/Section";
import { NotFound } from "../components/NotFound";
import { TypeBadgeLink } from "../components/TypeBadge";

export async function loader({ params }: { params: { name?: string } }) {
  const move = await getRecordOrNull("move", params.name ?? "");
  if (!move) return data({ notFound: true as const }, { status: 404 });

  const index = await getSpeciesIndex();
  const bySpecies = new Map<number, { id: number; name: string }>();
  for (const ref of move.learned_by_pokemon ?? []) {
    const species = pokemonRefToSpecies(ref, index);
    if (species && !bySpecies.has(species.id)) bySpecies.set(species.id, species);
  }
  const pokemon = [...bySpecies.values()].sort((a, b) => a.id - b.id);

  const shortEffect =
    move.effect_entries?.find((e: any) => e.language?.name === "en")?.short_effect?.replace(/\s+/g, " ").trim() ||
    null;

  return {
    notFound: false as const,
    title: englishName(move),
    type: move.type?.name ? { name: move.type.name, label: humanize(move.type.name) } : null,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: shortEffect ?? latestEnglishFlavor(move.flavor_text_entries),
    pokemon,
    spriteBase: mediaBase(),
  };
}

export default function MovePage({ loaderData }: { loaderData: any }) {
  if (loaderData.notFound) return <NotFound />;
  const d = loaderData;
  const value = (v: number | null) => (v === null || v === undefined ? EM_DASH : String(v));
  return (
    <>
      <title>{`${d.title} – Pokédex`}</title>
      <h1>{d.title}</h1>
      <dl className="detail-list">
        <div>
          <dt>Type</dt>
          <dd>{d.type ? <TypeBadgeLink name={d.type.name} label={d.type.label} /> : EM_DASH}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{d.category ?? EM_DASH}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{value(d.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{value(d.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{value(d.pp)}</dd>
        </div>
      </dl>

      <Section title="Effect">
        <p>{d.effect ?? EM_DASH}</p>
      </Section>

      <Section title="Learned by">
        <p className="count">{d.pokemon.length} Pokémon</p>
        <PokemonCardList species={d.pokemon} spriteBase={d.spriteBase} />
      </Section>
    </>
  );
}
