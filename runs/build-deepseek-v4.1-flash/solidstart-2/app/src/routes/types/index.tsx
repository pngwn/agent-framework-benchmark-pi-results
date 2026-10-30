import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import TypeBadge from "~/components/TypeBadge";
import { typeListQuery } from "~/lib/queries";

export default function TypesPage() {
  const types = createAsync(() => typeListQuery());

  return (
    <>
      <Title>Types – Pokédex</Title>
      <main class="page">
        <h1>Types</h1>
        <Show when={types()}>
          {(items) => (
            <ul class="type-list">
              <For each={items()}>
                {(type) => (
                  <li>
                    <TypeBadge name={type.name} label={type.label} link />
                  </li>
                )}
              </For>
            </ul>
          )}
        </Show>
      </main>
    </>
  );
}
