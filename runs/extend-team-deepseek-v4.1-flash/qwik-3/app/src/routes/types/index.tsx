import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { typesPage } from "~/lib/data";
import { pageTitle } from "~/lib/format";

export const useTypes = routeLoader$(() => typesPage());

export default component$(() => {
  const types = useTypes();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-grid">
        {types.value.map((t) => (
          <li key={t.name}>
            <Link href={`/types/${t.name}`} class={`type-tile type-${t.name}`}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = { title: pageTitle("Types") };
