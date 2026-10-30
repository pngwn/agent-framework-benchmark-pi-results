import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import { PageTitle } from "~/components";
import { getTypeList } from "~/lib/api";

export default function TypesPage() {
  const types = createAsync(() => getTypeList());
  return (
    <Show
      when={types()}
      fallback={
        <main class="page">
          <PageTitle text="Types – Pokédex" />
          <h1>Types</h1>
        </main>
      }
    >
      <main class="page">
        <PageTitle text="Types – Pokédex" />
        <h1>Types</h1>
        <ul class="type-grid">
          <For each={types()}>
            {type => (
              <li>
                <A href={`/types/${type.name}`} class={`type-tile type-${type.name}`}>
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
