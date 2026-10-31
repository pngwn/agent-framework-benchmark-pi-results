export function TypeBadge({ name, label, link }: { name: string; label: string; link?: boolean }) {
  if (link) {
    return (
      <a className="type-badge" data-type={name} href={`/types/${name}`}>
        {label}
      </a>
    )
  }
  return (
    <span className="type-badge" data-type={name}>
      {label}
    </span>
  )
}
