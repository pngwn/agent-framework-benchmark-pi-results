import { A } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";
import { dexNumber } from "~/lib/format";
import type { Card } from "~/lib/types";
import { TypeBadge } from "./TypeBadge";

export function CountText(props: { count: number; noun?: string }) {
  return <p class="count">{`${props.count} ${props.noun ?? "Pokémon"}`}</p>;
}

export function PokemonCardLink(props: { card: Card }) {
  return (
    <A href={`/pokemon/${props.card.name}`} class="card">
      <img class="card__sprite" src={props.card.sprite} alt="" width="96" height="96" loading="lazy" />
      <span class="card__dex">{dexNumber(props.card.id)}</span>
      <span class="card__name">{props.card.label}</span>
      <Show when={props.card.types?.length}>
        <span class="card__types">
          <For each={props.card.types}>{(type) => <TypeBadge type={type} />}</For>
        </span>
      </Show>
      <Show when={props.card.hidden}>
        <span class="card__note">Hidden ability</span>
      </Show>
    </A>
  );
}

export default function PokemonCards(props: { cards: Card[]; action?: (card: Card) => JSX.Element }) {
  return (
    <ul class="card-grid">
      <For each={props.cards}>
        {(card) => (
          <li>
            <PokemonCardLink card={card} />
            {props.action?.(card)}
          </li>
        )}
      </For>
    </ul>
  );
}
