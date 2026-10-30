import type { Route } from "./+types/ability";
import { apiOr404, getIndex, pokemonCards } from "../lib/api.server";
import { cleanText, englishName, latestFlavorText, MISSING, pageTitle, type NamedResource, type Translated } from "../lib/format";
import { Section } from "../components/Section";
import { PokemonCards } from "../components/PokemonCards";

type Ability = {
  name: string;
  names: Translated[];
  effect_entries: { short_effect: string; language: NamedResource }[];
  flavor_text_entries: { flavor_text: string; language: NamedResource }[];
  pokemon: { is_hidden: boolean; pokemon: NamedResource }[];
};

export async function loader({ params }: Route.LoaderArgs) {
  const [ability, index] = await Promise.all([
    apiOr404<Ability>(`ability/${encodeURIComponent(params.name.toLowerCase())}`),
    getIndex(),
  ]);
  const shortEffect = ability.effect_entries.find((e) => e.language.name === "en")?.short_effect;
  return {
    label: englishName(ability.names, ability.name),
    effect: shortEffect ? cleanText(shortEffect) : (latestFlavorText(ability.flavor_text_entries) ?? MISSING),
    pokemon: pokemonCards(
      index,
      ability.pokemon.map((p) => ({ ...p.pokemon, hidden: p.is_hidden })),
      (p) => ({ hidden: p.hidden }),
    ),
  };
}

export default function AbilityPage({ loaderData: d }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(d.label)}</title>
      <h1>{d.label}</h1>
      <Section title="Effect">
        <p>{d.effect}</p>
      </Section>
      <Section title="Pokémon">
        <p className="count">{d.pokemon.length} Pokémon</p>
        <PokemonCards cards={d.pokemon} />
      </Section>
    </>
  );
}
