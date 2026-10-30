import { Link } from '@tanstack/react-router'
import type { CardData } from '../lib/data.server'

export function TypeBadge({ name, label }: { name: string; label: string }) {
  return (
    <span className="type-badge" data-type={name}>
      {label}
    </span>
  )
}

export function PokemonCard({ card }: { card: CardData }) {
  return (
    <li className="pokemon-card-item">
      <Link
        to="/pokemon/$name"
        params={{ name: card.speciesName }}
        className="pokemon-card"
      >
        <span className="card-sprite-wrap">
          {card.sprite ? (
            <img className="card-sprite" src={card.sprite} alt="" loading="lazy" />
          ) : null}
        </span>
        <span className="card-dex">{card.dex}</span>
        <span className="card-name">{card.displayName}</span>
        {card.types.length > 0 ? (
          <span className="card-types">
            {card.types.map((type) => (
              <TypeBadge key={type.name} name={type.name} label={type.label} />
            ))}
          </span>
        ) : null}
        {card.hiddenAbility ? <span className="card-hidden">Hidden ability</span> : null}
      </Link>
    </li>
  )
}

export function PokemonCardList({ cards }: { cards: CardData[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={`${card.id}-${card.speciesName}`} card={card} />
      ))}
    </ul>
  )
}
