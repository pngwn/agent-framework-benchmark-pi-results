import { Link } from '@tanstack/react-router'
import { TypePill } from './TypeBadge'

export type PokemonCardData = {
  id: number
  dex: string
  name: string
  displayName: string
  href: string
  sprite: string | null
  types?: Array<{ name: string; label: string }>
  hidden?: boolean
}

export function PokemonCard({ card, showTypes = false }: { card: PokemonCardData; showTypes?: boolean }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: card.name }} className="pokemon-card">
        {card.sprite ? <img className="sprite" src={card.sprite} alt="" width={96} height={96} loading="lazy" /> : null}
        <span className="card-dex">{card.dex}</span>
        <span className="card-name">{card.displayName}</span>
        {showTypes && card.types?.length ? (
          <span className="card-types">
            {card.types.map((type) => (
              <TypePill key={type.name} name={type.name} label={type.label} />
            ))}
          </span>
        ) : null}
        {card.hidden ? <span className="hidden-ability">Hidden ability</span> : null}
      </Link>
    </li>
  )
}

export function PokemonCardGrid({
  cards,
  showTypes = false,
}: {
  cards: PokemonCardData[]
  showTypes?: boolean
}) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={`${card.id}-${card.hidden ? 'hidden' : ''}`} card={card} showTypes={showTypes} />
      ))}
    </ul>
  )
}
