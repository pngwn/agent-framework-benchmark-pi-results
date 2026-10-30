import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFoundContent, PokemonCards, TypeLink } from "../../../components/ui";
import { cardsFromRefs, getMove, getSpeciesIndex } from "../../../lib/api";
import {
  displayValue,
  englishName,
  humanize,
  latestEnglishFlavor,
} from "../../../lib/format";

export const useMoveData = routeLoader$(async ({ params }) => {
  const [move, speciesIndex] = await Promise.all([
    getMove(params.name),
    getSpeciesIndex(),
  ]);
  if (!move) return { notFound: true as const };

  const shortEffect = move.effect_entries.find(
    (entry) => entry.language.name === "en",
  )?.short_effect;
  const effect = shortEffect || latestEnglishFlavor(move.flavor_text_entries) || "—";

  return {
    notFound: false as const,
    title: englishName(move.names, move.name),
    type: move.type
      ? { name: move.type.name, english: humanize(move.type.name) }
      : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    cards: cardsFromRefs(move.learned_by_pokemon, speciesIndex),
  };
});

export default component$(() => {
  const data = useMoveData();
  if (data.value.notFound) return <NotFoundContent />;

  return (
    <>
      <h1>{data.value.title}</h1>

      <section class="panel facts-panel" aria-label="Move details">
        <dl class="facts-grid">
          <div>
            <dt>Type</dt>
            <dd>
              {data.value.type ? (
                <TypeLink name={data.value.type.name} label={data.value.type.english} />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.value.category ?? "—"}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{displayValue(data.value.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{displayValue(data.value.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{displayValue(data.value.pp)}</dd>
          </div>
        </dl>
      </section>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.value.effect}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="result-count">{data.value.cards.length} Pokémon</p>
        <PokemonCards cards={data.value.cards} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMoveData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.title} – Pokédex` };
};
