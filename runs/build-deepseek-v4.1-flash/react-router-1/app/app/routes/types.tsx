import { Link } from 'react-router';
import { getTypes } from '../lib/api.server';

export async function loader() {
  return getTypes();
}

export function meta() {
  return [{ title: 'Types – Pokédex' }];
}

export default function TypesPage({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return (
    <>
      <h1>Types</h1>
      <ul className="types-list">
        {loaderData.map((type) => (
          <li key={type.name}>
            <Link
              className={`type-badge type-${type.name}`}
              to={`/types/${type.name}`}
            >
              {type.english}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
