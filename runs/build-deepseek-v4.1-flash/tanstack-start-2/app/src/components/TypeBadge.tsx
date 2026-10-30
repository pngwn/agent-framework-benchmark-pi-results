import { Link } from '@tanstack/react-router'
import { typeBadgeClass } from '../lib/format'

export function TypeBadge({ name, label }: { name: string; label: string }) {
  return (
    <Link to="/types/$name" params={{ name }} className={typeBadgeClass(name)}>
      {label}
    </Link>
  )
}

export function TypePill({ name, label }: { name: string; label: string }) {
  return <span className={typeBadgeClass(name)}>{label}</span>
}
