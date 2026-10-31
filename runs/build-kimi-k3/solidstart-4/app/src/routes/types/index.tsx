import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import { getTypesList } from "~/lib/api";

export default function TypesPage() {
  const types = createAsync(() => getTypesList());
  return (
    <Show when={types()} fallback={<p class="loading">Loading…</p>}>
      {(list) => (
        <>
          <Title>Types – Pokédex</Title>
          <h1>Types</h1>
          <ul class="types-grid">
            <For each={list()}>
              {(t) => (
                <li>
                  <A href={`/types/${t.name}`} style={{ "background-color": `var(--type-${t.name})` }}>
                    {t.enName}
                  </A>
                </li>
              )}
            </For>
          </ul>
        </>
      )}
    </Show>
  );
}
