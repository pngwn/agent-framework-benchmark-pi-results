import Link from 'next/link';

import { getTypeDirectoryCached } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Types',
};

export default async function TypesPage() {
  const types = await getTypeDirectoryCached();

  return (
    <>
      <h1>Types</h1>
      <ul className="typeGrid">
        {types.map((type) => (
          <li key={type.name}>
            <Link href={`/types/${type.name}`} data-type={type.name}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
