import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { NotFound } from '../../../components/not-found';
import { PokemonCard } from '../../../components/pokemon-card';
import {
  ApiError,
  cardForSpecies,
  getSpeciesRefs,
  getTypeByName,
  type PokemonCardData,
  type TypeResource,
} from '../../../lib/api';
import { englishName, humanize, idFromUrl } from '../../../lib/format';

interface RelationGroup {
  term: string;
  types: Array<{ name: string; label: string }>;
}

export interface TypePageData {
  title: string;
  relations: RelationGroup[];
  cards: PokemonCardData[];
  moves: Array<{ name: string; label: string }>;
}

const RELATIONS: Array<{ term: string; key: keyof TypeResource['damage_relations'] }> = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
];

export const useTypePage = routeLoader$(async ({ params, status }) => {
  let typeData: TypeResource;
  try {
    typeData = await getTypeByName(params.name);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      status(404);
      return null;
    }
    throw error;
  }

  const species = await getSpeciesRefs();
  const speciesById = new Map(species.map((entry) => [entry.id, entry]));
  const pokemonIds = new Set<number>();
  for (const entry of typeData.pokemon) {
    const id = idFromUrl(entry.pokemon.url);
    if (id > 0 && id <= 10000) pokemonIds.add(id);
  }

  const cards = [...pokemonIds]
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

  const moves = typeData.moves
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    title: englishName(typeData),
    relations: RELATIONS.map((relation) => ({
      term: relation.term,
      types: typeData.damage_relations[relation.key].map((type) => ({
        name: type.name,
        label: humanize(type.name),
      })),
    })),
    cards,
    moves,
  } satisfies TypePageData;
});

export default component$(() => {
  const data = useTypePage();
  if (!data.value) return <NotFound />;
  const typeData = data.value;

  return (
    <div class="type-page">
      <h1>{typeData.title}</h1>

      <section class="panel" aria-labelledby="damage-heading">
        <h2 id="damage-heading">Damage relations</h2>
        <dl class="relations">
          {typeData.relations.map((relation) => (
            <div key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length ? (
                  <span class="relation-links">
                    {relation.types.map((type) => (
                      <a
                        class={`type-badge type-${type.name}`}
                        href={`/types/${type.name}`}
                        key={type.name}
                      >
                        {type.label}
                      </a>
                    ))}
                  </span>
                ) : (
                  'None'
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="panel" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p class="result-count">{typeData.cards.length} Pokémon</p>
        <ul class="pokemon-grid">
          {typeData.cards.map((card) => (
            <PokemonCard card={card} key={card.id} />
          ))}
        </ul>
      </section>

      <section class="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p class="result-count">{typeData.moves.length} moves</p>
        <ul class="plain-links">
          {typeData.moves.map((move) => (
            <li key={move.name}>
              <a href={`/moves/${move.name}`}>{move.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useTypePage) as TypePageData | null;
  return {
    title: data ? `${data.title} – Pokédex` : 'Not found – Pokédex',
  };
};
