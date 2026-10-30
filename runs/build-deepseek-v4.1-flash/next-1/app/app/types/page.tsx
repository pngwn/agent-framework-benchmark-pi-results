import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTypes } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Types',
};

export default async function TypesPage() {
  const types = await getAllTypes();

  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((type) => (
          <li key={type.name}>
            <Link className={`type-tile type-${type.name}`} href={`/types/${type.name}`}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
