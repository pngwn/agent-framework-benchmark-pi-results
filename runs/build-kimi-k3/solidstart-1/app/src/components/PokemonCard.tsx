import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { dexNumber, humanize } from "~/lib/util";

export type CardType = { name: string; en: string };

export default function PokemonCard(props: {
  id: number;
  name: string;
  sprite: string;
  types?: CardType[];
  hidden?: boolean;
}) {
  return (
    <li class="card">
      <A href={`/pokemon/${props.name}`} class="card-link">
        <img src={props.sprite} alt={humanize(props.name)} width="96" height="96" loading="lazy" />
        <span class="card-dex">{dexNumber(props.id)}</span>
        <span class="card-name">{humanize(props.name)}</span>
        <Show when={props.types}>
          <span class="card-types">
            <For each={props.types}>
              {(t) => (
                <span class="type-badge" data-type={t.name}>
                  {t.en}
                </span>
              )}
            </For>
          </span>
        </Show>
      </A>
      <Show when={props.hidden}>
        <span class="card-hidden">Hidden ability</span>
      </Show>
    </li>
  );
}
