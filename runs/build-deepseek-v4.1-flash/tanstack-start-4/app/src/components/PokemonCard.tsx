import { Link } from '@tanstack/react-router'
import { dexNumber } from '../lib/format'
import type { PokemonCardData } from '../lib/model'

export function TypePill({ name, label }: { name: string; label: string }) {
  return <span className={`type-badge type-${name}`}>{label}</span>
}

export function PokemonCard({ card }: { card: PokemonCardData }) {
  return (
    <li>
      <Link
        to="/pokemon/$name"
        params={{ name: card.name }}
        className="pokemon-card"
      >
        <img className="pokemon-card-sprite" src={card.sprite} alt="" width={96} height={96} />
        <span className="pokemon-card-dex">{dexNumber(card.id)}</span>
        <span className="pokemon-card-name">{card.label}</span>
        {card.types.length > 0 && (
          <span className="pokemon-card-types">
            {card.types.map((type) => (
              <TypePill key={type.name} name={type.name} label={type.label} />
            ))}
          </span>
        )}
        {card.hidden && <span className="pokemon-card-hidden">Hidden ability</span>}
      </Link>
    </li>
  )
}

export function PokemonCardList({ cards }: { cards: PokemonCardData[] }) {
  return (
    <ul className="pokemon-grid">
      {cards.map((card) => (
        <PokemonCard key={`${card.id}-${card.name}`} card={card} />
      ))}
    </ul>
  )
}
