import { Link } from "react-router";
import { getTypesList } from "~/lib/api.server";

export async function loader() {
  return { types: await getTypesList() };
}

export function meta() {
  return [{ title: "Types – Pokédex" }];
}

export default function TypesPage({ loaderData }: { loaderData: any }) {
  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {loaderData.types.map((type: any) => (
          <li key={type.name}>
            <Link
              to={`/types/${type.name}`}
              style={{ backgroundColor: `var(--type-${type.name}, #555e6b)` }}
            >
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
