import type { MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getTypesData } from "../lib/api.server";

export async function loader() {
  return getTypesData();
}

export const meta: MetaFunction<typeof loader> = () => [{ title: "Types – Pokédex" }];

export default function TypesRoute() {
  const types = useLoaderData<typeof loader>();

  return (
    <div className="types-page">
      <h1 className="page-title">Types</h1>
      <ul className="type-list">
        {types.map((type: any) => (
          <li key={type.name}>
            <Link className={`type-${type.name}`} to={`/types/${type.name}`}>
              {type.english}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
