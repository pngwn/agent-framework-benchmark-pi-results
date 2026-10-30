import { A } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

const isMissing = (value) => value === "—" || value == null || value === "";

function compareValues(a, b, direction) {
  const aMissing = isMissing(a);
  const bMissing = isMissing(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let result;
  if (typeof a === "number" && typeof b === "number") result = a - b;
  else result = String(a).localeCompare(String(b));
  return direction === "ascending" ? result : -result;
}

function sortedRows(rows, sort) {
  if (!sort.key) return rows;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const result = compareValues(a.row[sort.key], b.row[sort.key], sort.direction);
      return result || a.index - b.index;
    })
    .map(({ row }) => row);
}

function MoveTable(props) {
  const levelUp = () => props.table.method === "level-up";
  const columns = createMemo(() => {
    const cols = [{ key: "move", label: "Move" }];
    if (levelUp()) cols.unshift({ key: "level", label: "Level" });
    cols.push(
      { key: "type", label: "Type" },
      { key: "category", label: "Category" },
      { key: "power", label: "Power" },
      { key: "accuracy", label: "Accuracy" },
      { key: "pp", label: "PP" },
    );
    return cols;
  });

  const [sort, setSort] = createSignal({ key: "", direction: "ascending" });
  const rows = createMemo(() => sortedRows(props.table.rows, sort()));

  const toggle = (key) => {
    const current = sort();
    setSort({
      key,
      direction:
        current.key === key && current.direction === "ascending"
          ? "descending"
          : "ascending",
    });
  };

  const sortFor = (key) => {
    const current = sort();
    if (current.key !== key) return undefined;
    return current.direction;
  };

  return (
    <div class="move-table">
      <table>
        <caption>{props.table.label}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {(column) => (
                <th scope="col" aria-sort={sortFor(column.key)}>
                  <button type="button" onClick={() => toggle(column.key)}>
                    {column.label}
                    <Show when={sortFor(column.key)}>
                      <span class="sort-mark" aria-hidden="true">
                        {sortFor(column.key) === "ascending" ? " ▲" : " ▼"}
                      </span>
                    </Show>
                  </button>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(row) => (
              <tr>
                <Show when={levelUp()}>
                  <td class="numeric">{row.level}</td>
                </Show>
                <td>
                  <A href={row.moveHref}>{row.move}</A>
                </td>
                <td>
                  <A class={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
                    {row.type}
                  </A>
                </td>
                <td>{row.category}</td>
                <td class="numeric">{row.power}</td>
                <td class="numeric">{row.accuracy}</td>
                <td class="numeric">{row.pp}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

export default function MoveTables(props) {
  return (
    <For each={props.tables}>
      {(table) => <MoveTable table={table} />}
    </For>
  );
}
