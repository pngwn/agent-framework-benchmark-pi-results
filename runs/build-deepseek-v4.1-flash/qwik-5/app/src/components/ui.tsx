import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { CardData } from "../lib/api";
import { padDexNumber } from "../lib/format";

export const TypeBadge = component$<{
  name: string;
  label: string;
  variant?: "pill" | "block";
}>(({ name, label, variant = "pill" }) => {
  return (
    <span class={`type-badge type-${name} ${variant === "block" ? "type-block" : ""}`}>
      {label}
    </span>
  );
});

export const TypeLink = component$<{
  name: string;
  label: string;
  variant?: "pill" | "block";
}>(({ name, label, variant = "pill" }) => {
  return (
    <Link
      href={`/types/${name}`}
      class={`type-badge type-${name} ${variant === "block" ? "type-block" : ""}`}
    >
      {label}
    </Link>
  );
});

export const PokemonCard = component$<{ card: CardData; showTypes?: boolean }>(
  ({ card, showTypes = false }) => {
    return (
      <li class="pokemon-card-item">
        <Link href={`/pokemon/${card.name}`} class="pokemon-card">
          <img
            class="pokemon-sprite"
            src={card.sprite}
            alt=""
            width={96}
            height={96}
            loading="lazy"
          />
          <span class="pokemon-dex">{padDexNumber(card.id)}</span>
          <span class="pokemon-name">{card.display}</span>
          {showTypes && card.types?.length ? (
            <span class="card-types">
              {card.types.map((type) => (
                <TypeBadge key={type.name} name={type.name} label={type.english} />
              ))}
            </span>
          ) : null}
          {card.hidden ? <span class="hidden-ability">Hidden ability</span> : null}
        </Link>
      </li>
    );
  },
);

export const PokemonCards = component$<{
  cards: CardData[];
  showTypes?: boolean;
  label?: string;
}>(({ cards, showTypes = false }) => {
  return (
    <ul class="pokemon-grid" aria-label="Pokémon">
      {cards.map((card, index) => (
        <PokemonCard key={`${card.id}-${index}`} card={card} showTypes={showTypes} />
      ))}
    </ul>
  );
});

export const NotFoundContent = component$(() => {
  return (
    <>
      <h1>Not found</h1>
      <p class="not-found-link">
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </>
  );
});
