import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { dexNumber, humanize, spriteUrl } from '../lib/format'
import type { CardData, TypeRef } from '../lib/types'
import { useMediaBase } from '../lib/config'
import { TypeBadge } from './TypeBadge'

export function PokemonCardList({
  cards,
  typeLabels,
  renderAction,
}: {
  cards: CardData[]
  typeLabels?: Map<string, string>
  renderAction?: (card: CardData) => ReactNode
}) {
  const mediaBase = useMediaBase()
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id} className="card">
          <Link to="/pokemon/$name" params={{ name: card.name }} className="card-link">
            <img
              className="card-sprite"
              src={spriteUrl(mediaBase, card.id)}
              alt=""
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
            />
            <span className="card-number">{dexNumber(card.id)}</span>
            <span className="card-name">{humanize(card.name)}</span>
          </Link>
          {card.types && card.types.length > 0 && (
            <span className="card-types">
              {card.types.map((name) => {
                const type: TypeRef = { name, label: typeLabels?.get(name) ?? humanize(name) }
                return <TypeBadge key={name} type={type} link={false} />
              })}
            </span>
          )}
          {card.hidden && <span className="card-note">Hidden ability</span>}
          {renderAction?.(card)}
        </li>
      ))}
    </ul>
  )
}
