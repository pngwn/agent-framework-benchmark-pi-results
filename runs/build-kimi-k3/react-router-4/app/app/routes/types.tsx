import { Link } from "react-router";
import { getTypes } from "../lib/pokeapi";
import { englishName } from "../lib/utils";

export async function loader() {
  const types = await getTypes();
  return { types: types.map((t) => ({ name: t.name, display: englishName(t) })) };
}

export function meta() {
  return [{ title: "Types – Pokédex" }];
}

export default function TypesPage({ loaderData }: { loaderData: any }) {
  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {loaderData.types.map((t: any) => (
          <li key={t.name}>
            <Link
              to={`/types/${t.name}`}
              className="type-tile"
              style={{ backgroundColor: `var(--type-${t.name})` }}
            >
              {t.display}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
