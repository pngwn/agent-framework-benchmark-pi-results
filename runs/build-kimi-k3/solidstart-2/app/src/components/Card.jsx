import { A } from "@solidjs/router";
import { For } from "solid-js";
import { dexNumber } from "../lib/util.js";

export function TypeBadge(props) {
  return <span class={`type-badge type-${props.type.name}`}>{props.type.en}</span>;
}

export function TypeBadgeLink(props) {
  return (
    <A class={`type-badge type-${props.type.name}`} href={`/types/${props.type.name}`}>
      {props.type.en}
    </A>
  );
}

// A Pokémon card: a link to the species page with sprite, dex number and name.
export function PokemonCard(props) {
  return (
    <li class="card">
      <A href={`/pokemon/${props.card.name}`} class="card-link">
        <img class="card-sprite" src={props.card.sprite} alt="" width="96" height="96" loading="lazy" />
        <span class="card-dex">{dexNumber(props.card.id)}</span>
        <span class="card-name">{props.card.human}</span>
        {props.card.types && (
          <span class="card-badges">
            <For each={props.card.types}>{(t) => <TypeBadge type={t} />}</For>
          </span>
        )}
        {props.children}
      </A>
    </li>
  );
}

export function CardList(props) {
  return (
    <ul class="card-grid">
      <For each={props.cards}>{(card) => <PokemonCard card={card}>{props.extra?.(card)}</PokemonCard>}</For>
    </ul>
  );
}
