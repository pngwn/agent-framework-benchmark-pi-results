import { For } from "solid-js";
import { A } from "@solidjs/router";
import { dexNumber } from "~/lib/format";
import { TypeBadge } from "./Badge";

export interface CardItem {
  id: number;
  name: string;
  humanized: string;
  sprite: string | null;
  hidden?: boolean;
  types?: { name: string; en: string }[];
}

export default function PokemonCards(props: { cards: CardItem[]; showTypes?: boolean }) {
  return (
    <ul class="card-grid">
      <For each={props.cards}>
        {(card) => (
          <li>
            <A class="pokemon-card" href={`/pokemon/${card.name}`}>
              {card.sprite ? (
                <img src={card.sprite} alt="" width="96" height="96" loading="lazy" />
              ) : (
                <span class="sprite-placeholder" aria-hidden="true" />
              )}
              <span class="dex">{dexNumber(card.id)}</span>
              <span class="name">{card.humanized}</span>
              {props.showTypes && card.types?.length ? (
                <span class="badges">
                  <For each={card.types}>
                    {(t) => <TypeBadge name={t.name} label={t.en} />}
                  </For>
                </span>
              ) : null}
              {card.hidden ? <span class="hidden-flag">Hidden ability</span> : null}
            </A>
          </li>
        )}
      </For>
    </ul>
  );
}
