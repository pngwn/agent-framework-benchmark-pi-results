import { For } from "solid-js";
import type { CardData } from "~/lib/types";
import PokemonCard from "./PokemonCard";

export default function PokemonGrid(props: {
  cards: CardData[];
  showTypes?: boolean;
}) {
  return (
    <ul class="pokemon-grid">
      <For each={props.cards}>
        {(card) => (
          <li class="pokemon-card">
            <PokemonCard card={card} showTypes={props.showTypes} />
          </li>
        )}
      </For>
    </ul>
  );
}
