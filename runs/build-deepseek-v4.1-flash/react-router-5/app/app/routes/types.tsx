import { Link } from "react-router";
import type { Route } from "./+types/types";
import { getAllTypes } from "../lib/api.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Types – Pokédex" }];
}

export async function loader() {
  const types = await getAllTypes();
  return { types: types.map((type) => ({ name: type.name, label: type.label })) };
}

export default function Types({ loaderData }: Route.ComponentProps) {
  return (
    <div className="page">
      <h1>Types</h1>
      <ul className="type-list">
        {loaderData.types.map((type) => (
          <li key={type.name}>
            <Link className={`type-list-link type-${type.name}`} to={`/types/${type.name}`}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
