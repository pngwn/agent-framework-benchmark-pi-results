import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export type PokemonCardData = {
  id: number
  name: string
  label: string
  sprite: string
  hidden?: boolean
  types?: Array<{ name: string; label: string }>
}

export function dexNumber(id: number) {
  return `#${String(id).padStart(4, '0')}`
}

export function Section({
  id,
  title,
  children,
  className = '',
}: {
  id: string
  title: string
  children: ReactNode
  className?: string
}) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className={`panel section ${className}`}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  )
}

export function TypeBadge({
  name,
  label,
  small = false,
  link = true,
}: {
  name: string
  label: string
  small?: boolean
  link?: boolean
}) {
  const className = `type-badge type-${name}${small ? ' type-badge-sm' : ''}`
  if (!link) return <span className={className}>{label}</span>
  return (
    <Link to="/types/$name" params={{ name }} className={className}>
      {label}
    </Link>
  )
}

export function PokemonCard({
  card,
  showTypes = false,
}: {
  card: PokemonCardData
  showTypes?: boolean
}) {
  return (
    <li className="pokemon-card">
      <Link to="/pokemon/$name" params={{ name: card.name }} className="pokemon-card-link">
        <img className="sprite" src={card.sprite} alt="" loading="lazy" width="96" height="96" />
        <span className="dex-number">{dexNumber(card.id)}</span>
        <span className="pokemon-name">{card.label}</span>
        {showTypes && card.types && card.types.length > 0 ? (
          <span className="card-types">
            {card.types.map((type) => (
              <TypeBadge key={type.name} name={type.name} label={type.label} link={false} />
            ))}
          </span>
        ) : null}
        {card.hidden ? <span className="hidden-ability">Hidden ability</span> : null}
      </Link>
    </li>
  )
}

export function PokemonCardList({
  cards,
  showTypes = false,
}: {
  cards: PokemonCardData[]
  showTypes?: boolean
}) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={`${card.id}-${card.name}`} card={card} showTypes={showTypes} />
      ))}
    </ul>
  )
}

export function NotFoundPage() {
  return (
    <>
      <h1>Not found</h1>
      <p className="not-found-link">
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  )
}
