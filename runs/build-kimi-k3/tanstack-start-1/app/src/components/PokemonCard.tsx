import { Link } from '@tanstack/react-router'
import { dexNumber } from '../lib/format'
import { TypeBadge } from './TypeBadge'

export interface CardModel {
  id: number
  name: string
  display: string
  sprite: string
  hidden?: boolean
  types?: Array<{ name: string; display: string }>
}

export function PokemonCard({ card }: { card: CardModel }) {
  return (
    <li className="card">
      <Link to="/pokemon/$name" params={{ name: card.name }} className="card-link">
        <img className="card-sprite" src={card.sprite} alt="" />
        <span className="card-dex">{dexNumber(card.id)}</span>
        <span className="card-name">{card.display}</span>
        {card.types && card.types.length > 0 && (
          <span className="card-types">
            {card.types.map((t) => (
              <TypeBadge key={t.name} name={t.name} display={t.display} />
            ))}
          </span>
        )}
        {card.hidden ? <span className="card-hidden">Hidden ability</span> : null}
      </Link>
    </li>
  )
}

export function CardGrid({ cards }: { cards: CardModel[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} />
      ))}
    </ul>
  )
}
