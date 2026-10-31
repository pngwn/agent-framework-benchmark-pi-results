import { A } from "@solidjs/router";
import { Show } from "solid-js";
import type { TypeInfo } from "~/lib/api";
import { dexNumber } from "~/lib/format";
import { TypeBadge } from "./TypeBadge";

// A Pokémon card: link to the species page with front sprite, dex number and
// humanized species name. Types are only shown on the home page.
export function PokemonCard(props: {
  id: number;
  name: string;
  human: string;
  sprite: string;
  types?: TypeInfo[];
  note?: string;
}) {
  return (
    <li class="card">
      <A href={`/pokemon/${props.name}`}>
        <img src={props.sprite} alt="" width="96" height="96" loading="lazy" />
        <span class="card-dex">{dexNumber(props.id)}</span>
        <span class="card-name">{props.human}</span>
        <Show when={props.types}>
          {(types) => (
            <span class="card-types">
              {types().map((t) => (
                <TypeBadge type={t} />
              ))}
            </span>
          )}
        </Show>
        <Show when={props.note}>
          <span class="card-note">{props.note}</span>
        </Show>
      </A>
    </li>
  );
}
