import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { dexNumber } from "~/lib/format";
import type { CardSpecies, TypeRef } from "~/lib/queries";
import TypeBadge from "./TypeBadge";

export default function PokemonCard(props: {
  species: CardSpecies;
  types?: TypeRef[];
  showTypes?: boolean;
  hidden?: boolean;
}) {
  return (
    <li class="pokemon-card">
      <A class="pokemon-card-link" href={`/pokemon/${props.species.name}`}>
        <img class="pokemon-sprite" src={props.species.sprite} alt="" width="96" height="96" />
        <span class="dex-number">{dexNumber(props.species.id)}</span>
        <span class="pokemon-card-name">{props.species.label}</span>
        <Show when={props.showTypes && props.types?.length}>
          <span class="type-badges">
            <For each={props.types}>
              {(type) => <TypeBadge name={type.name} label={type.label} />}
            </For>
          </span>
        </Show>
      </A>
      <Show when={props.hidden}>
        <span class="hidden-note">Hidden ability</span>
      </Show>
    </li>
  );
}
