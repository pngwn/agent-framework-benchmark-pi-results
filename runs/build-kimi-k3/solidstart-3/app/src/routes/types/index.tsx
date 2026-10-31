import { For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { typesQuery } from "~/lib/queries";

export default function TypesPage() {
  const types = createAsync(() => typesQuery());
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
                  <A class={`type-tile type-${t.name}`} href={`/types/${t.name}`}>
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
