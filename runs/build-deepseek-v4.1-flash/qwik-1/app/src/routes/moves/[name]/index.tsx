import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFound } from '../../../components/not-found';
import { PokemonCard } from '../../../components/pokemon-card';
import {
  ApiError,
  cardForSpecies,
  getMoveByName,
  getSpeciesRefs,
  type PokemonCardData,
} from '../../../lib/api';
import {
  collapseWhitespace,
  displayValue,
  englishName,
  englishShortEffect,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
} from '../../../lib/format';

export interface MovePageData {
  title: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  cards: PokemonCardData[];
}

export const useMovePage = routeLoader$(async ({ params, status }) => {
  let move;
  try {
    move = await getMoveByName(params.name);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      status(404);
      return null;
    }
    throw error;
  }

  const species = await getSpeciesRefs();
  const speciesById = new Map(species.map((entry) => [entry.id, entry]));
  const learnedIds = new Set<number>();
  for (const learned of move.learned_by_pokemon) {
    const id = idFromUrl(learned.url);
    if (id > 0 && id <= 10000) learnedIds.add(id);
  }

  const cards = [...learnedIds]
    .sort((a, b) => a - b)
    .map((id) => {
      const match = speciesById.get(id);
      return match
        ? cardForSpecies(match)
        : {
            id,
            name: `pokemon-${id}`,
            displayName: `Pokémon ${id}`,
            sprite: null,
          };
    });

  const shortEffect = englishShortEffect(move);
  const effect = shortEffect
    ? collapseWhitespace(shortEffect)
    : latestEnglishFlavorText(move);

  return {
    title: englishName(move),
    typeName: move.type.name,
    typeLabel: humanize(move.type.name),
    category: humanize(move.damage_class.name),
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    cards,
  } satisfies MovePageData;
});

export default component$(() => {
  const data = useMovePage();
  if (!data.value) return <NotFound />;
  const move = data.value;

  return (
    <div class="move-page">
      <h1>{move.title}</h1>

      <dl class="details-list">
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
          <dd>{move.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{displayValue(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{displayValue(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{displayValue(move.pp)}</dd>
        </div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{move.effect}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="result-count">{move.cards.length} Pokémon</p>
        <ul class="pokemon-grid">
          {move.cards.map((card) => (
            <PokemonCard card={card} key={card.id} />
          ))}
        </ul>
      </section>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMovePage) as MovePageData | null;
  return {
    title: data ? `${data.title} – Pokédex` : 'Not found – Pokédex',
  };
};
