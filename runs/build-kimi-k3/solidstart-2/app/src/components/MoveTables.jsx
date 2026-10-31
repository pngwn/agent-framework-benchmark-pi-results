import { A } from "@solidjs/router";
import { createMemo, createSignal, For } from "solid-js";
import { EM_DASH } from "../lib/util.js";

const COLUMNS = [
  { key: "level", label: "Level" },
  { key: "moveEn", label: "Move" },
  { key: "typeEn", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function compareValues(a, b, dir) {
  const aMissing = a == null;
  const bMissing = b == null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1; // missing values sort last in both directions
  if (bMissing) return -1;
  const order = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
  return dir === "ascending" ? order : -order;
}

function MoveTable(props) {
  const [sort, setSort] = createSignal(null); // { key, dir }
  const columns = () => COLUMNS.filter((c) => c.key !== "level" || props.method.hasLevel);

  const sortedRows = createMemo(() => {
    const s = sort();
    if (!s) return props.method.rows;
    return [...props.method.rows].sort((a, b) => compareValues(a[s.key], b[s.key], s.dir));
  });

  const toggleSort = (key) => {
    const s = sort();
    if (s && s.key === key) {
      setSort({ key, dir: s.dir === "ascending" ? "descending" : "ascending" });
    } else {
      setSort({ key, dir: "ascending" });
    }
  };

  const num = (v) => (v == null ? EM_DASH : v);

  return (
    <table class="moves-table">
      <caption>{props.method.label}</caption>
      <thead>
        <tr>
          <For each={columns()}>
            {(col) => (
              <th aria-sort={sort()?.key === col.key ? sort().dir : undefined}>
                <button type="button" onClick={() => toggleSort(col.key)}>
                  {col.label}
                </button>
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={sortedRows()}>
          {(row) => (
            <tr>
              {props.method.hasLevel && <td>{row.level}</td>}
              <td>
                <A href={`/moves/${row.moveName}`}>{row.moveEn}</A>
              </td>
              <td>
                {row.typeName ? (
                  <A class={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
                    {row.typeEn}
                  </A>
                ) : (
                  EM_DASH
                )}
              </td>
              <td>{row.category}</td>
              <td>{num(row.power)}</td>
              <td>{num(row.accuracy)}</td>
              <td>{num(row.pp)}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

export function MoveTables(props) {
  return (
    <>
      <For each={props.methods}>{(method) => <MoveTable method={method} />}</For>
    </>
  );
}
