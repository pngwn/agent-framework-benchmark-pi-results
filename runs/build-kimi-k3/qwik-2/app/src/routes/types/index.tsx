import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getTypeList } from '~/lib/data';

export const useTypes = routeLoader$(async () => {
  return getTypeList();
});

export const head: DocumentHead = {
  title: 'Types – Pokédex',
};

export default component$(() => {
  const types = useTypes().value;
  return (
    <>
      <h1>Types</h1>
      <ul class="type-index">
        {types.map((t) => (
          <li key={t.name}>
            <a class={`type-index-link type-${t.name}`} href={`/types/${t.name}`}>
              {t.english}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
});
