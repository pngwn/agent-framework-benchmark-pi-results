import type { Route } from "./+types/move";
import { apiOr404, getIndex, pokemonCards, typeInfo } from "../lib/api.server";
import { cleanText, englishName, humanize, latestFlavorText, MISSING, orMissing, pageTitle, type NamedResource, type Translated } from "../lib/format";
import { Section } from "../components/Section";
import { TypeBadge } from "../components/TypeBadge";
import { PokemonCards } from "../components/PokemonCards";

type Move = {
  name: string;
  names: Translated[];
  type: NamedResource;
  damage_class: NamedResource | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_chance: number | null;
  effect_entries: { short_effect: string; language: NamedResource }[];
  flavor_text_entries: { flavor_text: string; language: NamedResource }[];
  learned_by_pokemon: NamedResource[];
};

export async function loader({ params }: Route.LoaderArgs) {
  const [move, index] = await Promise.all([
    apiOr404<Move>(`move/${encodeURIComponent(params.name.toLowerCase())}`),
    getIndex(),
  ]);
  const shortEffect = move.effect_entries.find((e) => e.language.name === "en")?.short_effect;
  const effect = shortEffect
    ? cleanText(shortEffect.replaceAll("$effect_chance", String(move.effect_chance ?? "")))
    : latestFlavorText(move.flavor_text_entries);
  return {
    label: englishName(move.names, move.name),
    type: typeInfo(index, move.type.name),
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: effect ?? MISSING,
    learnedBy: pokemonCards(index, move.learned_by_pokemon),
  };
}

export default function MovePage({ loaderData: d }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(d.label)}</title>
      <h1>{d.label}</h1>
      <dl className="panel facts facts--panel">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge {...d.type} link />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{orMissing(d.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orMissing(d.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orMissing(d.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orMissing(d.pp)}</dd>
        </div>
      </dl>
      <Section title="Effect">
        <p>{d.effect}</p>
      </Section>
      <Section title="Learned by">
        <p className="count">{d.learnedBy.length} Pokémon</p>
        <PokemonCards cards={d.learnedBy} />
      </Section>
    </>
  );
}
