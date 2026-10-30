import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getTypeRefs } from '../../lib/api';

export const useTypes = routeLoader$(() => getTypeRefs());

export default component$(() => {
  const types = useTypes();

  return (
    <div class="types-page">
      <h1>Types</h1>
      <ul class="type-grid">
        {types.value.map((type) => (
          <li key={type.name}>
            <a class={`type-link type-${type.name}`} href={`/types/${type.name}`}>
              {type.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Types – Pokédex',
};
