import { getTypes } from "../lib/api.server";
import { englishName } from "../lib/format";
import { TypeBadgeLink } from "../components/TypeBadge";

export async function loader() {
  const types = await getTypes();
  return {
    types: types.map((t) => ({ name: t.name, label: englishName(t) })),
  };
}

export default function TypesPage({ loaderData }: { loaderData: any }) {
  return (
    <>
      <title>Types – Pokédex</title>
      <h1>Types</h1>
      <ul className="type-list">
        {loaderData.types.map((t: any) => (
          <li key={t.name}>
            <TypeBadgeLink name={t.name} label={t.label} />
          </li>
        ))}
      </ul>
    </>
  );
}
