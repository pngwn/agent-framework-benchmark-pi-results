import Link from 'next/link';

// A type badge: a pill colored with the type's color. Renders as a link when `href`
// is given, otherwise as a span.
export default function TypeBadge({ name, label, href }) {
  if (href) {
    return (
      <Link className="type-badge" data-type={name} href={href}>
        {label}
      </Link>
    );
  }
  return (
    <span className="type-badge" data-type={name}>
      {label}
    </span>
  );
}
