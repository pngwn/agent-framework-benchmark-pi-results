import { A } from "@solidjs/router";
import { For } from "solid-js";
import { spriteUrl } from "~/lib/api";
import { dexNumber, humanize } from "~/lib/format";
import type { TypeInfo } from "~/lib/queries";

/** A card linking to a Pokémon (species) page: sprite, dex number, humanized name. */
export default function PokemonCard(props: {
  id: number;
  name: string;
  types?: TypeInfo[];
  note?: string;
}) {
  return (
    <li>
      <A class="card" href={`/pokemon/${props.name}`}>
        <img src={spriteUrl(props.id)} alt="" width="96" height="96" />
        <span class="card-dex">{dexNumber(props.id)}</span>
        <span class="card-name">{humanize(props.name)}</span>
        {props.types && (
          <span class="card-types">
            <For each={props.types}>
              {(t) => <span class={`type-badge type-${t.name}`}>{t.en}</span>}
            </For>
          </span>
        )}
        {props.note && <span class="card-note">{props.note}</span>}
      </A>
    </li>
  );
}
