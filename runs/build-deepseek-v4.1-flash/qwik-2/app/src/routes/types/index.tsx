import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$ } from "@builder.io/qwik-city";
import { loadTypeList } from "../../lib/api.server";

export const useTypeListLoader = routeLoader$(() => loadTypeList());

export const head: DocumentHead = {
  title: "Types – Pokédex",
};

export default component$(() => {
  const data = useTypeListLoader();

  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {data.value.types.map((type) => (
          <li key={type.name}>
            <Link
              className="type-square"
              data-type={type.name}
              href={`/types/${type.name}`}
            >
              {type.english}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
});
