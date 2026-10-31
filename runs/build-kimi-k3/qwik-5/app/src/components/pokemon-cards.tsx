import { component$ } from '@builder.io/qwik';
import { dexNumber, humanize } from '../lib/format';

export interface CardType {
  name: string;
  label: string;
}

export interface CardData {
  /** Species API name (used for the link). */
  name: string;
  /** Species id (dex number). */
  id: number;
  sprite: string | null;
  /** Types in slot order (home page only). */
  types?: CardType[];
  /** Extra note shown below the name (e.g. `Hidden ability`). */
  note?: string;
}

export const TypeBadge = component$<{ type: CardType; link?: boolean }>(({ type, link }) => {
  if (link) {
    return (
      <a class="type-badge" data-type={type.name} href={`/types/${type.name}`}>
        {type.label}
      </a>
    );
  }
  return (
    <span class="type-badge" data-type={type.name}>
      {type.label}
    </span>
  );
});

export const PokemonCards = component$<{ cards: CardData[] }>(({ cards }) => {
  return (
    <ul class="cards">
      {cards.map((card) => (
        <li key={card.id}>
          <a class="pokemon-card" href={`/pokemon/${card.name}`}>
            {card.sprite ? (
              <img src={card.sprite} alt="" width={96} height={96} />
            ) : (
              <span style={{ width: '96px', height: '96px', display: 'inline-block' }} />
            )}
            <span class="dex">{dexNumber(card.id)}</span>
            <span class="name">{humanize(card.name)}</span>
            {card.types && (
              <span class="badges">
                {card.types.map((t) => (
                  <TypeBadge key={t.name} type={t} />
                ))}
              </span>
            )}
            {card.note && <span class="note">{card.note}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
});
