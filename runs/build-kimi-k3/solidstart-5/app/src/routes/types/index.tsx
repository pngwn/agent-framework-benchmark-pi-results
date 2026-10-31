import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import { getIndex } from "~/lib/queries";

export default function TypesPage() {
  const index = createAsync(() => getIndex());

  return (
    <main class="container">
      <Title>Types – Pokédex</Title>
      <h1>Types</h1>
      <Show when={index()}>
        {(data) => (
          <ul class="type-list">
            <For each={data().types}>
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
