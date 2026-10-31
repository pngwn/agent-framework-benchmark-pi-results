import { Link } from '@tanstack/react-router'

export function TypeBadge({ name, display }: { name: string; display: string }) {
  return (
    <span className="type-badge" data-type={name}>
      {display}
    </span>
  )
}

export function TypeBadgeLink({ name, display }: { name: string; display: string }) {
  return (
    <Link to="/types/$name" params={{ name }} className="type-badge" data-type={name}>
      {display}
    </Link>
  )
}
