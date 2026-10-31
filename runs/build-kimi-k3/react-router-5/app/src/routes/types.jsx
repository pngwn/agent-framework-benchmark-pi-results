import { Link } from 'react-router';
import { getTypeData } from '../lib/api.server.js';

export async function loader() {
  const { types } = await getTypeData();
  return { types: types.map(({ name, en }) => ({ name, en })) };
}

export function meta() {
  return [{ title: 'Types – Pokédex' }];
}

export default function TypesPage({ loaderData }) {
  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {loaderData.types.map((t) => (
          <li key={t.name}>
            <Link to={`/types/${t.name}`} className={`type-tile type-${t.name}`}>
              {t.en}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
