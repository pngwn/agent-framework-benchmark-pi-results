import Link from 'next/link';
import { getPlayableTypes } from '../../lib/api.js';
import { humanize } from '../../lib/format.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Types',
};

export default async function TypesPage() {
  const types = await getPlayableTypes();

  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((t) => (
          <li key={t.name}>
            <Link className={`type-${t.name}`} href={`/types/${t.name}`}>
              {humanize(t.name)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
