export function TypeBadge({ name, label }: { name: string; label: string }) {
  return <span className={`type-badge type-${name}`}>{label}</span>;
}
