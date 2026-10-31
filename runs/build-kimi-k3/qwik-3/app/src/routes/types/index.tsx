import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getTypes } from "../../lib/api";

export const useTypes = routeLoader$(async () => {
  const types = await getTypes();
  return types.map((t) => ({ name: t.name, label: t.label }));
});

export default component$(() => {
  const types = useTypes().value;
  return (
    <>
      <h1>Types</h1>
      <ul class="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <a class={`type-tile t-${t.name}`} href={`/types/${t.name}`}>
              {t.label}
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
