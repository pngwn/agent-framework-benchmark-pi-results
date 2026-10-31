import { Link } from "react-router";
import type { Route } from "./+types/types";
import { getTypes } from "../lib/pokeapi.server";

export async function loader() {
  const types = await getTypes();
  return { types };
}

export function meta() {
  return [{ title: "Types – Pokédex" }];
}

export default function TypesPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {loaderData.types.map((t) => (
          <li key={t.name}>
            <Link
              to={`/types/${t.name}`}
              className="type-list-link"
              style={{ backgroundColor: `var(--type-${t.name}, var(--color-text-muted))` }}
            >
              {t.english}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
