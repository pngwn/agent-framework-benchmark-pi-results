import { Link } from '@tanstack/react-router'
import * as React from 'react'
import type { CardVM } from './data'

export function Section({
  id,
  title,
  headingId,
  children,
}: {
  id?: string
  title: string
  headingId: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={headingId} className="section">
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  )
}

export function TypeBadge({ name, label }: { name: string; label: string }) {
  return (
    <Link to="/types/$name" params={{ name }} className="type-badge" data-type={name}>
      {label}
    </Link>
  )
}

export function PokemonCard({
  card,
  showTypes = false,
}: {
  card: CardVM
  showTypes?: boolean
}) {
  return (
    <li className="card">
      <Link to="/pokemon/$name" params={{ name: card.name }} className="card-link">
        <img
          src={card.sprite}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          className="card-sprite"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.visibility = 'hidden'
          }}
        />
        <span className="card-dex">{card.dex}</span>
        <span className="card-name">{card.humanName}</span>
        {showTypes && card.types && card.types.length > 0 ? (
          <span className="card-types">
            {card.types.map((t) => (
              <span key={t.name} className="type-badge" data-type={t.name}>
                {t.englishName}
              </span>
            ))}
          </span>
        ) : null}
        {card.hidden ? <span className="card-hidden">Hidden ability</span> : null}
      </Link>
    </li>
  )
}

export function CardList({
  cards,
  showTypes = false,
}: {
  cards: CardVM[]
  showTypes?: boolean
}) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} showTypes={showTypes} />
      ))}
    </ul>
  )
}
