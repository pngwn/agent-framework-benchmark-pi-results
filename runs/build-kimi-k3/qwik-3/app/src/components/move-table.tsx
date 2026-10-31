import { $, component$, useSignal } from "@builder.io/qwik";

export interface MoveRow {
  level: number;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

const COLUMNS = [
  { key: "level", label: "Level" },
  { key: "move", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function cellValue(row: MoveRow, key: string): string | number | null {
  switch (key) {
    case "level":
      return row.level;
    case "move":
      return row.moveLabel;
    case "type":
      return row.typeLabel;
    case "category":
      return row.category;
    case "power":
      return row.power;
    case "accuracy":
      return row.accuracy;
    case "pp":
      return row.pp;
    default:
      return null;
  }
}

/** A learn-method table with sortable column headers. */
export const MoveTable = component$<{
  label: string;
  withLevel: boolean;
  rows: MoveRow[];
}>((props) => {
  const sortKey = useSignal<string | null>(null);
  const sortDir = useSignal<"ascending" | "descending">("ascending");

  const onSort = $((key: string) => {
    if (sortKey.value === key) {
      sortDir.value =
        sortDir.value === "ascending" ? "descending" : "ascending";
    } else {
      sortKey.value = key;
      sortDir.value = "ascending";
    }
  });

  let rows = props.rows;
  if (sortKey.value) {
    const key = sortKey.value;
    const dir = sortDir.value;
    rows = [...props.rows].sort((a, b) => {
      const av = cellValue(a, key);
      const bv = cellValue(b, key);
      const aMissing = av == null || av === "—";
      const bMissing = bv == null || bv === "—";
      // Missing values sort last in both directions.
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return dir === "ascending" ? cmp : -cmp;
    });
  }

  const columns = COLUMNS.filter((c) => props.withLevel || c.key !== "level");

  return (
    <table class="move-table">
      <caption>{props.label}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              aria-sort={
                sortKey.value === c.key
                  ? sortDir.value
                  : (undefined as never)
              }
            >
              <button type="button" onClick$={() => onSort(c.key)}>
                {c.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.moveName}-${i}`}>
            {props.withLevel && <td class="num">{r.level}</td>}
            <td>
              <a href={`/moves/${r.moveName}`}>{r.moveLabel}</a>
            </td>
            <td>
              {r.typeName ? (
                <a class={`type-badge t-${r.typeName}`} href={`/types/${r.typeName}`}>
                  {r.typeLabel}
                </a>
              ) : (
                "—"
              )}
            </td>
            <td>{r.category}</td>
            <td class="num">{r.power ?? "—"}</td>
            <td class="num">{r.accuracy ?? "—"}</td>
            <td class="num">{r.pp ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});
