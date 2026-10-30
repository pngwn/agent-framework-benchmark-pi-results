import Link from 'next/link';

export function TypePill({ name, englishName, href }) {
  const className = `type-pill type-${name}`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {englishName}
      </Link>
    );
  }
  return <span className={className}>{englishName}</span>;
}
