import Link from 'next/link';
import { getTypes } from '../../lib/pokeapi';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Types – Pokédex',
};

export default async function TypesPage() {
  const types = await getTypes();
  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {types.map((type) => (
          <li key={type.name}>
            <Link href={`/types/${type.name}`} className={`type-pill type-pill-large type-${type.name}`}>
              {type.englishName}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
