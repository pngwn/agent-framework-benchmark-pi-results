import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function TypeBadge({ type }: { type: { name: string; englishName: string } }) {
  return (
    <span className="badge" style={{ backgroundColor: `var(--type-${type.name}, var(--color-text-muted))` }}>
      {type.englishName}
    </span>
  )
}

export function TypeBadgeLink({ type }: { type: { name: string; englishName: string } }) {
  return (
    <Link
      to="/types/$name"
      params={{ name: type.name }}
      className="badge"
      style={{ backgroundColor: `var(--type-${type.name}, var(--color-text-muted))` }}
    >
      {type.englishName}
    </Link>
  )
}

export type Card = {
  id: number
  speciesName: string
  name: string
  sprite: string
  types?: { name: string; englishName: string }[]
  hiddenAbility?: boolean
}

export function PokemonCard({ card, showTypes = false }: { card: Card; showTypes?: boolean }) {
  return (
    <>
      <Link to="/pokemon/$name" params={{ name: card.speciesName }} className="card">
        <img src={card.sprite} alt="" width={96} height={96} loading="lazy" />
        <span className="dex">#{String(card.id).padStart(4, '0')}</span>
        <span className="card-name">{card.name}</span>
        {showTypes && card.types && card.types.length > 0 && (
          <span className="badges">
            {card.types.map((t) => (
              <TypeBadge key={t.name} type={t} />
            ))}
          </span>
        )}
      </Link>
      {card.hiddenAbility && <span className="card-note">Hidden ability</span>}
    </>
  )
}

export function CardList({ cards, showTypes = false }: { cards: Card[]; showTypes?: boolean }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id} className="card-grid-item">
          <PokemonCard card={card} showTypes={showTypes} />
        </li>
      ))}
    </ul>
  )
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="section" aria-labelledby={`${id}-heading`} id={id === 'moves' ? 'moves' : undefined}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  )
}
