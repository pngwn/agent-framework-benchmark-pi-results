import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getTypePage } from '~/lib/api';
import { NotFound, PokemonCards } from '~/components/ui';

export const useTypePage = routeLoader$(async ({ params, status }) => {
  const data = await getTypePage(params.name);
  if (!data) {
    status(404);
    return { notFound: true as const };
  }
  return data;
});

export default component$(() => {
  const data = useTypePage();
  if (data.value.notFound) return <NotFound />;
  return (
    <>
      <h1>{data.value.englishName}</h1>

      <section class="panel" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="relations">
          {data.value.relations.map((relation) => (
            <div class="relation" key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length === 0 ? 'None' : relation.types.map((type: any) => (
                  <a class="relation-type" href={`/types/${type.name}`} key={type.name}>{type.label}</a>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="panel" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p class="result-count">{data.value.pokemon.length} Pokémon</p>
        <PokemonCards cards={data.value.pokemon} />
      </section>

      <section class="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p class="result-count">{data.value.moves.length} moves</p>
        <ul class="link-columns">
          {data.value.moves.map((move: any) => (
            <li key={move.name}><a href={`/moves/${move.name}`}>{move.label}</a></li>
          ))}
        </ul>
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useTypePage);
  return { title: data.notFound ? 'Not found – Pokédex' : `${data.englishName} – Pokédex` };
};
