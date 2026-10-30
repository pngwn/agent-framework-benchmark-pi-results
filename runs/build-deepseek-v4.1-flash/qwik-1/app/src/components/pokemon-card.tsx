import { component$ } from '@builder.io/qwik';
import { dexNumber } from '../lib/format';
import type { PokemonCardData } from '../lib/api';

interface PokemonCardProps {
  card: PokemonCardData;
  showTypes?: boolean;
}

export const PokemonCard = component$<PokemonCardProps>(({ card, showTypes }) => {
  return (
    <li class="pokemon-card-item">
      <a class="pokemon-card" href={`/pokemon/${card.name}`}>
        {card.sprite ? (
          <img
            class="pokemon-card-sprite"
            src={card.sprite}
            alt={card.displayName}
            width={96}
            height={96}
          />
        ) : (
          <span class="pokemon-card-sprite" aria-hidden="true" />
        )}
        <span class="pokemon-card-dex">{dexNumber(card.id)}</span>
        <span class="pokemon-card-name">{card.displayName}</span>
        {showTypes && card.types?.length ? (
          <span class="type-badges">
            {card.types.map((type) => (
              <span class={`type-badge type-${type.name}`} key={type.name}>
                {type.label}
              </span>
            ))}
          </span>
        ) : null}
        {card.hiddenAbility ? <span class="hidden-ability">Hidden ability</span> : null}
      </a>
    </li>
  );
});
