import Link from 'next/link';
import type { TypeInfo } from '@/lib/api';

/** A type pill. Rendered as a link to the type page unless `plain` is set. */
export function TypeBadge({ type, plain = false }: { type: TypeInfo; plain?: boolean }) {
  const className = `type-badge type-${type.name}`;
  if (plain) return <span className={className}>{type.label}</span>;
  return (
    <Link className={className} href={`/types/${type.name}`}>
      {type.label}
    </Link>
  );
}

export function TypeBadges({ types, plain = false }: { types: TypeInfo[]; plain?: boolean }) {
  return (
    <span className="type-badges">
      {types.map((type) => (
        <TypeBadge key={type.name} type={type} plain={plain} />
      ))}
    </span>
  );
}
