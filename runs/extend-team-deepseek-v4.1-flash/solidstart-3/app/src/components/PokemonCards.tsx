import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { dexNumber } from "~/lib/format";
import type { Card } from "~/lib/types";
import { TypeBadge } from "./TypeBadge";

export function CountText(props: { count: number; noun?: string }) {
  return <p class="count">{`${props.count} ${props.noun ?? "Pokémon"}`}</p>;
}

export default function PokemonCards(props: { cards: Card[]; onRemove?: (card: Card) => void }) {
  return (
    <ul class="card-grid">
      <For each={props.cards}>
        {(card) => (
          <li>
            <A href={`/pokemon/${card.name}`} class="card">
              <img class="card__sprite" src={card.sprite} alt="" width="96" height="96" loading="lazy" />
              <span class="card__dex">{dexNumber(card.id)}</span>
              <span class="card__name">{card.label}</span>
              <Show when={card.types?.length}>
                <span class="card__types">
                  <For each={card.types}>{(type) => <TypeBadge type={type} />}</For>
                </span>
              </Show>
              <Show when={card.hidden}>
                <span class="card__note">Hidden ability</span>
              </Show>
            </A>
            <Show when={props.onRemove}>
              <button type="button" class="card__remove" onClick={() => props.onRemove?.(card)}>
                {`Remove ${card.label}`}
              </button>
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}
