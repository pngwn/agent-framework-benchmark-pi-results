import { Link } from '@tanstack/react-router'
import type { CSSProperties, ReactNode } from 'react'
import type { TypeRef } from '~/lib/types'

function styleFor(name: string): CSSProperties {
  return { backgroundColor: `var(--type-${name})` }
}

export function TypeBadge({ type, className = '' }: { type: TypeRef; className?: string }) {
  return (
    <span className={`type-badge ${className}`.trim()} style={styleFor(type.name)}>
      {type.label}
    </span>
  )
}

export function TypeLink({ type, className = '' }: { type: TypeRef; className?: string }) {
  return (
    <Link
      to="/types/$name"
      params={{ name: type.name }}
      className={`type-badge type-badge-link ${className}`.trim()}
      style={styleFor(type.name)}
    >
      {type.label}
    </Link>
  )
}

export function TypeTile({ type }: { type: TypeRef }) {
  return (
    <Link
      to="/types/$name"
      params={{ name: type.name }}
      className="type-tile"
      style={styleFor(type.name)}
    >
      {type.label}
    </Link>
  )
}

export function TypeList({ types }: { types: TypeRef[] }): ReactNode {
  return (
    <>
      {types.map((type) => (
        <TypeLink key={type.name} type={type} />
      ))}
    </>
  )
}
