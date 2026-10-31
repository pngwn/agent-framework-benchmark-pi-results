import { component$ } from '@builder.io/qwik';
import type { CardData } from '../lib/data';
import { dexNo } from '../lib/util';

export const TypeBadge = component$<{ name: string; label: string }>(({ name, label }) => {
  return <span class={`type-badge type-${name}`}>{label}</span>;
});

export const PokemonCard = component$<{ card: CardData; showTypes?: boolean }>(({ card, showTypes }) => {
  return (
    <li class="card">
      <a href={`/pokemon/${card.name}`} class="card-link">
        <img src={card.sprite} alt="" width={96} height={96} loading="lazy" class="card-sprite" />
        <span class="card-dex">{dexNo(card.id)}</span>
        <span class="card-name">{card.label}</span>
        {showTypes && card.types && card.types.length > 0 && (
          <span class="card-types">
            {card.types.map((t) => (
              <TypeBadge key={t.name} name={t.name} label={t.label} />
            ))}
          </span>
        )}
        {card.hiddenAbility && <span class="card-hidden">Hidden ability</span>}
      </a>
    </li>
  );
});

export const CardGrid = component$<{ cards: CardData[]; showTypes?: boolean }>(({ cards, showTypes }) => {
  return (
    <ul class="card-grid">
      {cards.map((c) => (
        <PokemonCard key={c.id} card={c} showTypes={showTypes} />
      ))}
    </ul>
  );
});
