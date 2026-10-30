import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { dexNumber } from "~/lib/format";
import type { CardData } from "~/lib/types";
import TypeBadge from "./TypeBadge";

export default function PokemonCard(props: {
  card: CardData;
  showTypes?: boolean;
}) {
  return (
    <A class="pokemon-card-link" href={`/pokemon/${props.card.name}`}>
      <img
        class="pokemon-card-sprite"
        src={props.card.sprite}
        alt=""
        width="96"
        height="96"
        loading="lazy"
      />
      <span class="pokemon-card-number">{dexNumber(props.card.id)}</span>
      <span class="pokemon-card-name">{props.card.displayName}</span>
      <Show when={props.showTypes && props.card.types.length > 0}>
        <span class="type-badges">
          <For each={props.card.types}>
            {(type) => <TypeBadge name={type.name} label={type.label} />}
          </For>
        </span>
      </Show>
      <Show when={props.card.hidden}>
        <span class="hidden-ability">Hidden ability</span>
      </Show>
    </A>
  );
}
