import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getTypes } from '../../lib/data';

export const useTypesData = routeLoader$(async () => {
  return { types: await getTypes() };
});

export const head: DocumentHead = {
  title: 'Types – Pokédex',
};

export default component$(() => {
  const data = useTypesData();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-tiles">
        {data.value.types.map((t) => (
          <li key={t.name}>
            <a class={`type-tile type-${t.name}`} href={`/types/${t.name}`}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
});
