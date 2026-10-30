import { Link } from '@tanstack/react-router'
import type { CardData } from '~/lib/types'
import { TypeBadge } from './TypeBadge'

export function PokemonCard({ card, showTypes = false }: { card: CardData; showTypes?: boolean }) {
  return (
    <li className="pokemon-card">
      <Link to="/pokemon/$name" params={{ name: card.speciesName }} className="pokemon-card-link">
        {card.sprite ? (
          <img className="pokemon-card-sprite" src={card.sprite} alt="" width={96} height={96} />
        ) : (
          <span className="pokemon-card-sprite card-sprite-placeholder" aria-hidden="true" />
        )}
        <span className="card-dex">{card.dexNumber}</span>
        <span className="card-name">{card.displayName}</span>
        {showTypes && card.types?.length ? (
          <span className="card-types">
            {card.types.map((type) => (
              <TypeBadge key={type.name} type={type} />
            ))}
          </span>
        ) : null}
      </Link>
      {card.hiddenAbility ? <span className="card-hidden">Hidden ability</span> : null}
    </li>
  )
}

export function PokemonCardList({
  cards,
  showTypes = false,
}: {
  cards: CardData[]
  showTypes?: boolean
}) {
  return (
    <ul className="pokemon-grid">
      {cards.map((card) => (
        <PokemonCard key={card.speciesName} card={card} showTypes={showTypes} />
      ))}
    </ul>
  )
}
