import { Link } from "react-router";
import type { Route } from "./+types/types";
import { getTypeList } from "../lib/data.server";

export const meta: Route.MetaFunction = () => [{ title: "Types – Pokédex" }];

export async function loader() {
  return { types: await getTypeList() };
}

export default function Types({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {loaderData.types.map((type) => (
          <li key={type.name}>
            <Link className={`type-tile type-${type.name}`} to={`/types/${type.name}`}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
