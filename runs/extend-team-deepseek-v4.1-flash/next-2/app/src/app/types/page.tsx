import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getAllTypes } from '@/lib/api';
import { englishName } from '@/lib/format';

export const metadata: Metadata = { title: 'Types' };

export default async function TypesPage() {
  await connection();
  const types = await getAllTypes();
  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <Link className={`type-tile type-${t.name}`} href={`/types/${t.name}`}>
              {englishName(t.names, t.name)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
