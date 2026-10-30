import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getMovePage } from '~/lib/api';
import { displayNumber } from '~/lib/format';
import { NotFound, PokemonCards } from '~/components/ui';

export const useMovePage = routeLoader$(async ({ params, status }) => {
  const data = await getMovePage(params.name);
  if (!data) {
    status(404);
    return { notFound: true as const };
  }
  return data;
});

export default component$(() => {
  const data = useMovePage();
  if (data.value.notFound) return <NotFound />;
  return (
    <>
      <h1>{data.value.englishName}</h1>

      <dl class="summary-list panel summary-list--inline">
        <div class="summary-item">
          <dt>Type</dt>
          <dd>
            {data.value.type ? (
              <a class={`type-badge type-${data.value.type}`} href={`/types/${data.value.type}`}>{data.value.typeLabel}</a>
            ) : '—'}
          </dd>
        </div>
        <div class="summary-item"><dt>Category</dt><dd>{data.value.category}</dd></div>
        <div class="summary-item"><dt>Power</dt><dd>{displayNumber(data.value.power)}</dd></div>
        <div class="summary-item"><dt>Accuracy</dt><dd>{displayNumber(data.value.accuracy)}</dd></div>
        <div class="summary-item"><dt>PP</dt><dd>{displayNumber(data.value.pp)}</dd></div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.value.effect}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="result-count">{data.value.learned.length} Pokémon</p>
        <PokemonCards cards={data.value.learned} />
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useMovePage);
  return { title: data.notFound ? 'Not found – Pokédex' : `${data.englishName} – Pokédex` };
};
