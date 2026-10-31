import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  apiFetch,
  getSpeciesNameById,
  getTypes,
  spriteBase,
  toSpeciesCards,
  typeLabel,
} from "../../../lib/api";
import {
  englishName,
  humanize,
  latestEnglishFlavor,
} from "../../../lib/format";
import { NotFound, PokemonCardList, Section } from "../../../components/ui";

export const useMove = routeLoader$(async (ev) => {
  const move = await apiFetch(`move/${ev.params.name.toLowerCase()}/`);
  if (!move) {
    ev.status(404);
    return null;
  }
  const [types, speciesNames] = await Promise.all([
    getTypes(),
    getSpeciesNameById(),
  ]);
  const effect =
    move.effect_entries?.find((e: any) => e.language?.name === "en")
      ?.short_effect ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    "—";
  return {
    name: englishName(move.names) ?? humanize(move.name),
    typeName: move.type?.name ? String(move.type.name) : "",
    typeLabel: move.type?.name ? typeLabel(types, move.type.name) : "—",
    category: move.damage_class?.name
      ? humanize(move.damage_class.name)
      : "—",
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learned: toSpeciesCards(move.learned_by_pokemon ?? [], speciesNames),
    sprites: spriteBase(),
  };
});

export default component$(() => {
  const data = useMove().value;
  if (!data) return <NotFound />;
  return (
    <>
      <h1>{data.name}</h1>
      <div class="panel">
        <dl class="facts">
          <div>
            <dt>Type</dt>
            <dd>
              {data.typeName ? (
                <a
                  class={`type-badge t-${data.typeName}`}
                  href={`/types/${data.typeName}`}
                >
                  {data.typeLabel}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{data.power ?? "—"}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{data.accuracy ?? "—"}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{data.pp ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <Section title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section title="Learned by">
        <p class="count">{data.learned.length} Pokémon</p>
        <PokemonCardList items={data.learned} sprites={data.sprites} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMove);
  return { title: data ? `${data.name} – Pokédex` : "Not found – Pokédex" };
};
