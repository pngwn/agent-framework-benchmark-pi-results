import Link from 'next/link';
import { spriteUrl, type CardData } from '@/lib/api';
import { dexNumber, humanize } from '@/lib/format';
import { TypeBadges } from './type-badge';

export function PokemonCard({ card }: { card: CardData }) {
  return (
    <Link className="card" href={`/pokemon/${card.name}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- sprites come from the API server */}
      <img className="card-sprite" src={spriteUrl(card.id)} alt="" width={96} height={96} loading="lazy" decoding="async" />
      <span className="card-number">{dexNumber(card.id)}</span>
      <span className="card-name">{humanize(card.name)}</span>
      {card.types && <TypeBadges types={card.types} plain />}
      {card.hiddenAbility && <span className="card-note">Hidden ability</span>}
    </Link>
  );
}

export function PokemonCardList({ cards }: { cards: CardData[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id}>
          <PokemonCard card={card} />
        </li>
      ))}
    </ul>
  );
}
