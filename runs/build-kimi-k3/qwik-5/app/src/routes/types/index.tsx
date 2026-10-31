import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getTypeIndex } from '../../lib/api';

export const useTypesData = routeLoader$(async () => {
  const typeIndex = await getTypeIndex();
  return { types: typeIndex.list };
});

export default component$(() => {
  const data = useTypesData();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-list">
        {data.value.types.map((t) => (
          <li key={t.name}>
            <a href={`/types/${t.name}`} style={{ background: `var(--type-${t.name})` }}>
              {t.label}
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
