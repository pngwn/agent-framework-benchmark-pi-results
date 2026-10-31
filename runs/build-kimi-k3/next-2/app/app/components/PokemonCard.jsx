import Link from 'next/link';
import { dexNumber, humanize } from '../../lib/format.js';

export function TypeBadge({ name, label }) {
  return <span className={`type-badge type-${name}`}>{label ?? humanize(name)}</span>;
}

// A Pokémon card: a link to the species page with sprite, dex number and name.
export function PokemonCard({ card, showTypes = false }) {
  return (
    <li>
      <Link href={`/pokemon/${card.name}`} className="card">
        {card.sprite ? (
          <img className="card-sprite" src={card.sprite} alt="" width={96} height={96} />
        ) : null}
        <span className="card-dex">{dexNumber(card.id)}</span>
        <span className="card-name">{humanize(card.name)}</span>
        {showTypes && card.types?.length ? (
          <span className="card-types">
            {card.types.map((t) => (
              <TypeBadge key={t} name={t} />
            ))}
          </span>
        ) : null}
        {card.hidden ? <span className="card-note">Hidden ability</span> : null}
      </Link>
    </li>
  );
}

export function PokemonCardList({ cards, showTypes = false }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} showTypes={showTypes} />
      ))}
    </ul>
  );
}
