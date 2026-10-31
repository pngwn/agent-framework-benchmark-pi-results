import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import { getTypesData } from "../../lib/data.js";

export const route = {
  preload: () => getTypesData(),
};

export default function TypesPage() {
  const types = createAsync(() => getTypesData());
  return (
    <main class="container">
      <Title>Types – Pokédex</Title>
      <h1>Types</h1>
      <Show when={types()}>
        {(list) => (
          <ul class="type-list">
            <For each={list()}>
              {(t) => (
                <li>
                  <A class={`type-badge type-badge-lg type-${t.name}`} href={`/types/${t.name}`}>
                    {t.en}
                  </A>
                </li>
              )}
            </For>
          </ul>
        )}
      </Show>
    </main>
  );
}
