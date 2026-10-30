import { Link } from "react-router";
import type { Route } from "./+types/types";
import { getIndex } from "../lib/api.server";
import { pageTitle } from "../lib/format";

export async function loader() {
  const index = await getIndex();
  return { types: index.types };
}

export default function TypesPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle("Types")}</title>
      <h1>Types</h1>
      <ul className="type-grid">
        {loaderData.types.map((t) => (
          <li key={t.name}>
            <Link to={`/types/${t.name}`} className={`type-tile type-${t.name}`}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
