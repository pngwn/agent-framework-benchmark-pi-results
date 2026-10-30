import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getTypeIndex } from '~/lib/api';

export const useTypeList = routeLoader$(async () => {
  const types = await getTypeIndex();
  return types.map((type) => ({ name: type.name, label: type.label }));
});

export default component$(() => {
  const types = useTypeList();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-list">
        {types.value.map((type) => (
          <li key={type.name}>
            <a class={`type-tile type-${type.name}`} href={`/types/${type.name}`}>{type.label}</a>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Types – Pokédex',
};
