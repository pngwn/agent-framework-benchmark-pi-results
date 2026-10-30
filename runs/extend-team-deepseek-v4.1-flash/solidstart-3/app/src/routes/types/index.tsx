import { Title } from "@solidjs/meta";
import { A, createAsync, type RouteDefinition } from "@solidjs/router";
import { For } from "solid-js";
import { pageTitle } from "~/lib/format";
import { getTypes } from "~/lib/queries";

export const route = {
  preload: () => getTypes(),
} satisfies RouteDefinition;

export default function TypesPage() {
  const types = createAsync(() => getTypes());
  return (
    <>
      <Title>{pageTitle("Types")}</Title>
      <h1 class="page-title">Types</h1>
      <ul class="type-grid">
        <For each={types()}>
          {(type) => (
            <li>
              <A href={`/types/${type.name}`} class="type-tile" style={{ "background-color": `var(--type-${type.name})` }}>
                {type.label}
              </A>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
