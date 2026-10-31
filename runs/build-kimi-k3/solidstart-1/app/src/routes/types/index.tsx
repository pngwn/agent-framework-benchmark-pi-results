import { Title } from "@solidjs/meta";
import { A, createAsync, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import { getTypeListData } from "~/lib/queries";

export const route = {
  preload: () => getTypeListData(),
} satisfies RouteDefinition;

export default function TypesPage() {
  const data = createAsync(() => getTypeListData());
  return (
    <>
      <Title>Types – Pokédex</Title>
      <h1>Types</h1>
      <Show when={data()}>
        <ul class="type-grid">
          <For each={data()}>
            {(t: any) => (
              <li>
                <A href={`/types/${t.name}`} class="type-tile" data-type={t.name}>
                  {t.en}
                </A>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  );
}
