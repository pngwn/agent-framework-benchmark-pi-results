import { Link } from "react-router";

type Props = { name: string; label: string; link?: boolean };

export function TypeBadge({ name, label, link = false }: Props) {
  const className = `type-badge type-${name}`;
  return link ? (
    <Link to={`/types/${name}`} className={className}>
      {label}
    </Link>
  ) : (
    <span className={className}>{label}</span>
  );
}

export function TypeBadges({ types, link }: { types: { name: string; label: string }[]; link?: boolean }) {
  return (
    <span className="type-badges">
      {types.map((t) => (
        <TypeBadge key={t.name} {...t} link={link} />
      ))}
    </span>
  );
}
