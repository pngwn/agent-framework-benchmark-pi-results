import { Link } from "react-router";
import { humanize } from "../lib/format";

export function TypeBadge({ name, label }: { name: string; label?: string }) {
  return <span className={`type-badge type-${name}`}>{label ?? humanize(name)}</span>;
}

export function TypeBadgeLink({ name, label }: { name: string; label?: string }) {
  return (
    <Link className={`type-badge type-${name}`} to={`/types/${name}`}>
      {label ?? humanize(name)}
    </Link>
  );
}
