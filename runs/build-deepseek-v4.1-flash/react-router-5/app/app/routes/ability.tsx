import { data } from "react-router";
import type { Route } from "./+types/ability";
import { ApiNotFoundError, getResource, getSpeciesList } from "../lib/api.server";
import { englishName, humanize, idFromUrl } from "../lib/format";
import { NotFound } from "../components/NotFound";
import { PokemonCardGrid } from "../components/PokemonCard";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.notFound ? "Not found" : loaderData?.name ?? "Ability";
  return [{ title: `${title} – Pokédex` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  let ability: any;
  try {
    ability = await getResource("ability", params.name);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return data({ notFound: true } as const, { status: 404 });
    }
    throw error;
  }

  const species = await getSpeciesList();
  const byId = new Map(species.map((entry) => [entry.id, entry]));
  const seen = new Map<number, { name: string; hidden: boolean }>();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (id <= 0 || id >= 10000) continue;
    const existing = seen.get(id);
    if (existing) {
      existing.hidden = existing.hidden || Boolean(entry.is_hidden);
    } else {
      seen.set(id, { name: entry.pokemon.name, hidden: Boolean(entry.is_hidden) });
    }
  }

  const pokemon = [...seen.entries()]
    .map(([id, value]) => {
      const found = byId.get(id);
      return found ? { ...found, hidden: value.hidden } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => a.id - b.id);

  const hiddenNames = new Set(pokemon.filter((entry) => entry.hidden).map((entry) => entry.name));

  return {
    notFound: false,
    name: englishName(ability.names) ?? humanize(ability.name),
    effect: englishName(ability.effect_entries, "short_effect") ?? "—",
    pokemon,
    hiddenNames: [...hiddenNames],
  };
}

export default function Ability({ loaderData }: Route.ComponentProps) {
  if (loaderData.notFound) return <NotFound />;
  const { name, effect, pokemon, hiddenNames } = loaderData;

  return (
    <div className="page">
      <h1>{name}</h1>

      <section className="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p className="effect-text">{effect}</p>
      </section>

      <section className="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="section-count">{pokemon.length} Pokémon</p>
        <PokemonCardGrid pokemon={pokemon} hiddenNames={hiddenNames} />
      </section>
    </div>
  );
}
