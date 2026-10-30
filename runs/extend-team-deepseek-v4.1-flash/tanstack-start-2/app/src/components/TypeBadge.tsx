import { Link } from '@tanstack/react-router'
import type { TypeRef } from '../lib/types'

export function TypeBadge({ type, link = true }: { type: TypeRef; link?: boolean }) {
  const className = `type-badge type-${type.name}`
  if (!link) return <span className={className}>{type.label}</span>
  return (
    <Link to="/types/$name" params={{ name: type.name }} className={className}>
      {type.label}
    </Link>
  )
}
