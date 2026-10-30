import { Link } from "react-router";
import { getTypeEntries } from "../lib/data.server";

export function meta() {
  return [{ title: "Types – Pokédex" }];
}

export async function loader() {
  return { types: await getTypeEntries() };
}

export default function Types({ loaderData }: any) {
  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {loaderData.types.map((type: any) => (
          <li key={type.name}>
            <Link className={`type-badge type-${type.name}`} to={`/types/${type.name}`}>
              {type.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
