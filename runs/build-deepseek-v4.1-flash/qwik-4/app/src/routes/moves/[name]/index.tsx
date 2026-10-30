import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  englishName,
  formatValue,
  getRecord,
  getTypeLabelMap,
  humanize,
  latestEnglishFlavor,
  speciesCardsFromRefs,
  typeLabelFor,
} from "../../../lib/data";
import { NotFound } from "../../../components/not-found";
import { PokemonCard } from "../../../components/ui";

export const useMoveData = routeLoader$(async ({ params }) => {
  const move = await getRecord("move", params.name);
  if (!move) return { notFound: true as const };

  const [typeLabels, pokemon] = await Promise.all([
    getTypeLabelMap(),
    speciesCardsFromRefs(move.learned_by_pokemon ?? []),
  ]);
  const typeName = String(move.type?.name ?? "");
  const englishEffect = (move.effect_entries ?? []).find(
    (entry: any) => entry.language?.name === "en" && entry.short_effect,
  )?.short_effect;
  const flavor = latestEnglishFlavor(move);

  return {
    notFound: false as const,
    englishName: englishName(move),
    typeName,
    typeLabel: typeName ? typeLabelFor(typeLabels, typeName) : "—",
    category: humanize(String(move.damage_class?.name ?? "")),
    power: formatValue(move.power),
    accuracy: formatValue(move.accuracy),
    pp: formatValue(move.pp),
    effect: englishEffect || flavor || "—",
    pokemon,
  };
});

export default component$(() => {
  const data = useMoveData();
  if (data.value.notFound) return <NotFound />;
  const move = data.value;

  return (
    <>
      <h1>{move.englishName}</h1>

      <dl class="detail-list move-detail-list">
        <div>
          <dt>Type</dt>
          <dd>
            <a class={`type-badge type-${move.typeName}`} href={`/types/${move.typeName}`}>
              {move.typeLabel}
            </a>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.category || "—"}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{move.power}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{move.accuracy}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{move.pp}</dd>
        </div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{move.effect}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">{move.pokemon.length} Pokémon</p>
        <ul class="card-grid">
          {move.pokemon.map((card) => (
            <PokemonCard key={card.id} card={card} />
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMoveData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.englishName} – Pokédex` };
};
