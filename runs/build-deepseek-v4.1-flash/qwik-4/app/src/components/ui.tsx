import { component$ } from "@builder.io/qwik";
import { displayDex, humanize } from "../lib/data";

export type CardData = {
  id: number;
  name: string;
  displayName?: string;
  sprite?: string | null;
  types?: string[];
  hidden?: boolean;
};

export const PokemonCard = component$<{ card: CardData; showTypes?: boolean }>(({ card, showTypes }) => {
  const name = card.displayName ?? humanize(card.name);
  return (
    <li class="pokemon-card-item">
      <a class="pokemon-card" href={`/pokemon/${card.name}`}>
        {card.sprite ? (
          <img class="sprite" src={card.sprite} alt="" width={96} height={96} />
        ) : (
          <span class="sprite-placeholder" aria-hidden="true" />
        )}
        <span class="dex-number">{displayDex(card.id)}</span>
        <span class="card-name">{name}</span>
        {showTypes && card.types && card.types.length > 0 ? (
          <span class="type-row">
            {card.types.map((type) => (
              <span key={type} class={`type-badge type-${type}`}>
                {humanize(type)}
              </span>
            ))}
          </span>
        ) : null}
        {card.hidden ? <span class="hidden-ability">Hidden ability</span> : null}
      </a>
    </li>
  );
});

export const TypeBadgeLink = component$<{ name: string; label: string }>(({ name, label }) => (
  <a class={`type-badge type-${name}`} href={`/types/${name}`}>
    {label}
  </a>
));
