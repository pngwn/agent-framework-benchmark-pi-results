import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog } from '../lib/catalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Types',
};

export default async function TypesPage() {
  const catalog = await getCatalog();

  return (
    <main className="shell page">
      <h1>Types</h1>
      <ul className="type-grid">
        {catalog.types.map((type) => (
          <li key={type.name}>
            <Link href={`/types/${type.name}`} className={`type-${type.name}`}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
