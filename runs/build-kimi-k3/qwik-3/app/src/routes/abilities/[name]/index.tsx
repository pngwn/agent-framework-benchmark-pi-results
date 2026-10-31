import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  apiFetch,
  getSpeciesNameById,
  spriteBase,
} from "../../../lib/api";
import { englishName, humanize, idFromUrl } from "../../../lib/format";
import {
  NotFound,
  PokemonCardList,
  Section,
  type CardItem,
} from "../../../components/ui";

export const useAbility = routeLoader$(async (ev) => {
  const ability = await apiFetch(`ability/${ev.params.name.toLowerCase()}/`);
  if (!ability) {
    ev.status(404);
    return null;
  }
  const speciesNames = await getSpeciesNameById();
  const seen = new Set<number>();
  const pokemon: CardItem[] = [];
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (!Number.isFinite(id) || id >= 10000 || seen.has(id)) continue;
    seen.add(id);
    pokemon.push({
      id,
      name: speciesNames.get(id) ?? entry.pokemon.name,
      note: entry.is_hidden ? "Hidden ability" : undefined,
    });
  }
  pokemon.sort((a, b) => a.id - b.id);
  return {
    name: englishName(ability.names) ?? humanize(ability.name),
    effect:
      ability.effect_entries?.find((e: any) => e.language?.name === "en")
        ?.short_effect ?? "—",
    pokemon,
    sprites: spriteBase(),
  };
});

export default component$(() => {
  const data = useAbility().value;
  if (!data) return <NotFound />;
  return (
    <>
      <h1>{data.name}</h1>
      <Section title="Effect">
        <p>{data.effect}</p>
      </Section>
      <Section title="Pokémon">
        <p class="count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList items={data.pokemon} sprites={data.sprites} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbility);
  return { title: data ? `${data.name} – Pokédex` : "Not found – Pokédex" };
};
