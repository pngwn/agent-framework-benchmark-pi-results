import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getTypes } from '../../lib/data';

export const useTypesData = routeLoader$(async () => {
  const types = await getTypes();
  return types.map((t) => ({ api: t.name, en: t.en }));
});

export default component$(() => {
  const data = useTypesData();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-grid">
        {data.value.map((t) => (
          <li key={t.api}>
            <a class={`type-${t.api}`} href={`/types/${t.api}`}>
              {t.en}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Types – Pokédex',
};
