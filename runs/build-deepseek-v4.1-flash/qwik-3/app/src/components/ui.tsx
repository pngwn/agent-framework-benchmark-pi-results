import { component$ } from '@builder.io/qwik';
import type { HomeCard, PokemonCard } from '~/lib/api';
import { dexNumber, humanize } from '~/lib/format';

export const TypeBadge = component$((props: { name: string; label?: string }) => {
  return (
    <span class={`type-badge type-${props.name}`}>
      {props.label ?? humanize(props.name)}
    </span>
  );
});

export const PokemonCards = component$((props: { cards: PokemonCard[] }) => {
  return (
    <ul class="card-grid">
      {props.cards.map((card) => (
        <li class="pokemon-card" key={card.id}>
          <a class="pokemon-card__link" href={`/pokemon/${card.name}`}>
            <img class="pokemon-card__sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" />
            <span class="pokemon-card__number">{dexNumber(card.id)}</span>
            <span class="pokemon-card__name">{humanize(card.name)}</span>
          </a>
          {card.hidden && <span class="pokemon-card__hidden">Hidden ability</span>}
        </li>
      ))}
    </ul>
  );
});

export const HomeCards = component$((props: { cards: HomeCard[] }) => {
  return (
    <ul class="card-grid">
      {props.cards.map((card) => (
        <li class="pokemon-card pokemon-card--home" key={card.id}>
          <a class="pokemon-card__link" href={`/pokemon/${card.name}`}>
            <img class="pokemon-card__sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" />
            <span class="pokemon-card__number">{dexNumber(card.id)}</span>
            <span class="pokemon-card__name">{humanize(card.name)}</span>
          </a>
          {card.types.length > 0 && (
            <span class="pokemon-card__types">
              {card.types.map((type) => <TypeBadge key={type} name={type} />)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
});

export const NotFound = component$(() => {
  return (
    <>
      <h1>Not found</h1>
      <p class="not-found-link"><a href="/">Back to the Pokédex</a></p>
    </>
  );
});

export const typeClassName = (name: string) => `type-${name}`;
