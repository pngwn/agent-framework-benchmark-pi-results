import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFound } from '../../../components/not-found';
import { PokemonCard } from '../../../components/pokemon-card';
import {
  ApiError,
  cardForSpecies,
  getAbilityByName,
  getSpeciesRefs,
  type PokemonCardData,
} from '../../../lib/api';
import {
  collapseWhitespace,
  englishName,
  englishShortEffect,
  idFromUrl,
} from '../../../lib/format';

export interface AbilityPageData {
  title: string;
  effect: string;
  cards: PokemonCardData[];
}

export const useAbilityPage = routeLoader$(async ({ params, status }) => {
  let ability;
  try {
    ability = await getAbilityByName(params.name);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      status(404);
      return null;
    }
    throw error;
  }

  const species = await getSpeciesRefs();
  const speciesById = new Map(species.map((entry) => [entry.id, entry]));
  const hiddenById = new Map<number, boolean>();
  for (const entry of ability.pokemon) {
    const id = idFromUrl(entry.pokemon.url);
    if (id > 0 && id <= 10000) {
      hiddenById.set(id, Boolean(hiddenById.get(id)) || entry.is_hidden);
    }
  }

  const cards = [...hiddenById.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, hidden]) => {
      const match = speciesById.get(id);
      const card = match
        ? cardForSpecies(match)
        : {
            id,
            name: `pokemon-${id}`,
            displayName: `Pokémon ${id}`,
            sprite: null,
          };
      return { ...card, hiddenAbility: hidden };
    });

  const shortEffect = englishShortEffect(ability);
  return {
    title: englishName(ability),
    effect: shortEffect ? collapseWhitespace(shortEffect) : '—',
    cards,
  } satisfies AbilityPageData;
});

export default component$(() => {
  const data = useAbilityPage();
  if (!data.value) return <NotFound />;
  const ability = data.value;

  return (
    <div class="ability-page">
      <h1>{ability.title}</h1>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{ability.effect}</p>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="result-count">{ability.cards.length} Pokémon</p>
        <ul class="pokemon-grid">
          {ability.cards.map((card) => (
            <PokemonCard card={card} key={card.id} />
          ))}
        </ul>
      </section>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbilityPage) as AbilityPageData | null;
  return {
    title: data ? `${data.title} – Pokédex` : 'Not found – Pokédex',
  };
};
