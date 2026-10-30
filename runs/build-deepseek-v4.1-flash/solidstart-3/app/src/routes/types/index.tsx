import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import { getTypeList } from "~/lib/data";

export default function TypesPage() {
  const [types] = createResource(() => getTypeList());

  return (
    <Show
      when={types()}
      fallback={
        <main class="container">
          <h1>Types</h1>
        </main>
      }
    >
      <Title>Types – Pokédex</Title>
      <main class="container">
        <h1>Types</h1>
        <ul class="type-list">
          <For each={types()}>
            {(type) => (
              <li>
                <A href={`/types/${type.name}`} class={`type-badge type-${type.name}`}>
                  {type.label}
                </A>
              </li>
            )}
          </For>
        </ul>
      </main>
    </Show>
  );
}
