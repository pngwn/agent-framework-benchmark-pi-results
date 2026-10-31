import Link from 'next/link';
import { getTypeRecords } from 'lib/api';
import { enName } from 'lib/format';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Types' };

export default async function TypesPage() {
  const records = await getTypeRecords();
  return (
    <>
      <h1 className="page-title">Types</h1>
      <ul className="type-list">
        {records.map((t) => (
          <li key={t.name}>
            <Link className={`type-tile type-${t.name}`} href={`/types/${t.name}`} prefetch={false}>
              {enName(t.names, t.name)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
