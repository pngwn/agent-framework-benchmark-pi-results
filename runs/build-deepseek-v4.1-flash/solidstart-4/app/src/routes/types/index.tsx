import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import TypeBadge from "~/components/TypeBadge";
import { getTypeListData } from "~/lib/queries";

export default function TypesPage() {
  const data = createAsync(() => getTypeListData());

  return (
    <>
      <Title>Types – Pokédex</Title>
      <h1>Types</h1>
      <Show when={data()}>
        {(types) => (
          <ul class="type-grid">
            <For each={types().types}>
              {(type) => (
                <li>
                  <TypeBadge name={type.name} label={type.label} link />
                </li>
              )}
            </For>
          </ul>
        )}
      </Show>
    </>
  );
}
