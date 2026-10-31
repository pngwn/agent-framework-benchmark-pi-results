import Link from 'next/link';

// Type badge shown as a link to the type page.
export function TypeBadgeLink({ name, label }) {
  return (
    <Link className={`badge type-${name}`} href={`/types/${name}`} prefetch={false}>
      {label}
    </Link>
  );
}

// Plain (non-link) type badges, used inside Pokémon cards which are
// themselves links.
export function TypeBadges({ types }) {
  if (!types?.length) return null;
  return (
    <span className="badges">
      {types.map((t) => (
        <span key={t.name} className={`badge type-${t.name}`}>
          {t.label}
        </span>
      ))}
    </span>
  );
}
