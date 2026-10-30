import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getTypes } from "../../lib/data";

export const useTypeList = routeLoader$(async () => {
  const types = await getTypes();
  return types.map((type) => ({ name: type.name, label: type.label }));
});

export default component$(() => {
  const types = useTypeList();
  return (
    <>
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
    </>
  );
});

export const head: DocumentHead = {
  title: "Types – Pokédex",
};
