import { Title } from "@solidjs/meta";
import { A, createAsync, query } from "@solidjs/router";
import { For, Show } from "solid-js";
import { loadTypesPage } from "~/server/data";

const getTypesPage = query(loadTypesPage, "types-page");

export default function TypesRoute() {
  const data = createAsync(() => getTypesPage());

  return (
    <Show when={data()} fallback={<main class="container"><p>Loading…</p></main>}>
      <Title>Types – Pokédex</Title>
      <main class="container">
        <h1>Types</h1>
        <ul class="types-grid">
          <For each={data().types}>
            {(type) => (
              <li>
                <A class={`type-tile type-${type.name}`} href={`/types/${type.name}`}>
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
