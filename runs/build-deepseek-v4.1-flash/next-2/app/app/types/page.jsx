import Link from 'next/link';
import { getTypes } from '@/lib/api';
import { typeColorStyle } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Types – Pokédex',
};

export default async function TypesPage() {
  const typeData = await getTypes();

  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {typeData.list.map((type) => (
          <li key={type.name}>
            <Link
              href={`/types/${type.name}`}
              className="type-tile"
              style={typeColorStyle(type.name)}
            >
              {type.english}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
