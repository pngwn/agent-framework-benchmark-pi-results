// Shared UI components.

import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { CardData } from './data'
import { MISSING, dexNumber, humanize } from './format'

export function TypeBadge({ name, label }: { name: string; label?: string }) {
  return (
    <span className={`type-badge type-${name}`}>
      {label ?? humanize(name)}
    </span>
  )
}

export function TypeBadgeLink({ name, label }: { name: string; label?: string }) {
  return (
    <Link to="/types/$name" params={{ name }} className={`type-badge type-${name}`}>
      {label ?? humanize(name)}
    </Link>
  )
}

/** A section: element with the region role, named by its heading. */
export function Section({
  id,
  heading,
  children,
  className,
}: {
  id?: string
  heading: string
  children: ReactNode
  className?: string
}) {
  const headingId = `${id ?? heading.toLowerCase().replace(/\s+/g, '-')}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className={`panel ${className ?? ''}`}>
      <h2 id={headingId}>{heading}</h2>
      {children}
    </section>
  )
}

/** A Pokémon card: link to the species page with sprite, dex number and name. */
export function PokemonCard({
  card,
  types,
}: {
  card: CardData
  types?: { name: string; label: string }[]
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
        />
        <span className="card-dex">{dexNumber(card.id)}</span>
        <span className="card-name">{card.label}</span>
        {types && types.length > 0 && (
          <span className="card-types">
            {types.map((t) => (
              <TypeBadge key={t.name} name={t.name} label={t.label} />
            ))}
          </span>
        )}
        {card.hidden && <span className="card-hidden">Hidden ability</span>}
      </Link>
    </li>
  )
}

export function CardList({
  cards,
  typesByName,
}: {
  cards: CardData[]
  typesByName?: Map<string, { name: string; label: string }[]>
}) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} types={typesByName?.get(card.name)} />
      ))}
    </ul>
  )
}

export function Missing() {
  return <>{MISSING}</>
}
