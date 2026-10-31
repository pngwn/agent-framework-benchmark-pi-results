import Link from 'next/link';
import { getTypes } from '../../lib/data.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Types',
};

export default async function TypesPage() {
  const types = await getTypes();
  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <Link href={`/types/${t.name}`} className={`type-badge type-${t.name}`}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
