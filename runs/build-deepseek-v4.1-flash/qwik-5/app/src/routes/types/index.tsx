import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getTypeCatalog } from "../../lib/api";

export const useTypesData = routeLoader$(async () => {
  const catalog = await getTypeCatalog();
  return { types: catalog.types };
});

export default component$(() => {
  const data = useTypesData();
  return (
    <>
      <h1>Types</h1>
      <ul class="types-grid">
        {data.value.types.map((type) => (
          <li key={type.name}>
            <Link href={`/types/${type.name}`} class={`type-tile type-${type.name}`}>
              {type.english}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: "Types – Pokédex",
};
