import { component$ } from '@builder.io/qwik';
import { dexNumber } from '~/lib/format';
import { TypeBadge } from './type-badge';
import type { TypeInfo } from '~/lib/data';

export interface CardData {
  id: number;
  name: string;
  human: string;
  sprite: string;
  types?: string[];
  hiddenAbility?: boolean;
}

/** A Pokémon card: a link to the species page with sprite, dex number and name. */
export const PokemonCard = component$<{ card: CardData; typeList?: TypeInfo[] }>((props) => {
  const { card } = props;
  const typeEnglish = new Map((props.typeList ?? []).map((t) => [t.name, t.english]));
  return (
    <li>
      <a class="card" href={`/pokemon/${card.name}`}>
        <img src={card.sprite} alt="" width={96} height={96} />
        <span class="card-dex">{dexNumber(card.id)}</span>
        <span class="card-name">{card.human}</span>
        {card.types && card.types.length > 0 && (
          <span class="card-badges">
            {card.types.map((t) => (
              <TypeBadge key={t} name={t} english={typeEnglish.get(t) ?? t} />
            ))}
          </span>
        )}
        {card.hiddenAbility && <span class="card-hidden">Hidden ability</span>}
      </a>
    </li>
  );
});

/** A list of Pokémon cards. */
export const PokemonCardList = component$<{ cards: CardData[]; typeList?: TypeInfo[] }>((props) => (
  <ul class="card-grid">
    {props.cards.map((card) => (
      <PokemonCard key={card.id} card={card} typeList={props.typeList} />
    ))}
  </ul>
));
