import Link from 'next/link';

export default function TypeBadge({
  name,
  label,
  link = false,
}: {
  name: string;
  label: string;
  link?: boolean;
}) {
  const className = `type-badge type-${name}`;
  if (link) {
    return (
      <Link className={className} href={`/types/${name}`}>
        {label}
      </Link>
    );
  }
  return <span className={className}>{label}</span>;
}
