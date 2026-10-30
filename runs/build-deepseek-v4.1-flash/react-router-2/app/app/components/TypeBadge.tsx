import { Link } from "react-router";
import { humanize } from "../lib/format";

export function TypeBadge({
  name,
  label,
  to,
  small = false,
}: {
  name: string;
  label?: string;
  to?: string;
  small?: boolean;
}) {
  const className = `type-badge type-${name}${small ? " type-badge-small" : ""}`;
  const text = label ?? humanize(name);
  if (to) {
    return (
      <Link className={className} to={to}>
        {text}
      </Link>
    );
  }
  return <span className={className}>{text}</span>;
}
