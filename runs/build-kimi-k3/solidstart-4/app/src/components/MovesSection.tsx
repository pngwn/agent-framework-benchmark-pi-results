import { A } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { Select } from "./Select";

interface MoveRow {
  level: number;
  moveName: string;
  moveEn: string;
  typeName: string | null;
  typeEn: string | null;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface Method {
  name: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
}

type SortKey = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";

const MISSING = "—";

function rowValue(row: MoveRow, key: SortKey): string | number | null {
  switch (key) {
    case "level":
      return row.level;
    case "move":
      return row.moveEn;
    case "type":
      return row.typeEn;
    case "category":
      return row.category === MISSING ? null : row.category;
    case "power":
      return row.power;
    case "accuracy":
      return row.accuracy;
    case "pp":
      return row.pp;
  }
}

function MovesTable(props: { method: Method }) {
  const [sortKey, setSortKey] = createSignal<SortKey | null>(null);
  const [sortDir, setSortDir] = createSignal<"ascending" | "descending">("ascending");

  const columns = createMemo(() => {
    const cols: { key: SortKey; label: string }[] = [];
    if (props.method.hasLevel) cols.push({ key: "level", label: "Level" });
    cols.push(
      { key: "move", label: "Move" },
      { key: "type", label: "Type" },
      { key: "category", label: "Category" },
      { key: "power", label: "Power" },
      { key: "accuracy", label: "Accuracy" },
      { key: "pp", label: "PP" },
    );
    return cols;
  });

  const rows = createMemo(() => {
    const key = sortKey();
    if (!key) return props.method.rows;
    const dir = sortDir() === "ascending" ? 1 : -1;
    return props.method.rows.slice().sort((a, b) => {
      const va = rowValue(a, key);
      const vb = rowValue(b, key);
      const ma = va === null || va === undefined;
      const mb = vb === null || vb === undefined;
      if (ma && mb) return 0;
      if (ma) return 1; // missing values sort last in both directions
      if (mb) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey() === key) {
      setSortDir((d) => (d === "ascending" ? "descending" : "ascending"));
    } else {
      setSortKey(key);
      setSortDir("ascending");
    }
  };

  return (
    <div class="table-wrap">
      <table class="moves-table">
        <caption>{props.method.label}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {(col) => (
                <th scope="col" aria-sort={sortKey() === col.key ? sortDir() : undefined}>
                  <button type="button" class="th-button" onClick={() => toggleSort(col.key)}>
                    {col.label}
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
                <Show when={props.method.hasLevel}>
                  <td>{row.level}</td>
                </Show>
                <td>
                  <A href={`/moves/${row.moveName}`}>{row.moveEn}</A>
                </td>
                <td>
                  <Show when={row.typeName} fallback={MISSING}>
                    <A class="type-badge" style={{ "background-color": `var(--type-${row.typeName})` }} href={`/types/${row.typeName}`}>
                      {row.typeEn}
                    </A>
                  </Show>
                </td>
                <td>{row.category}</td>
                <td>{row.power ?? MISSING}</td>
                <td>{row.accuracy ?? MISSING}</td>
                <td>{row.pp ?? MISSING}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

export function MovesSection(props: {
  games: { name: string; label: string }[];
  selectedGame: string;
  moves: { methods: Method[] } | null | undefined;
  onGameChange: (game: string) => void;
}) {
  let sectionEl: HTMLElement | undefined;
  onMount(() => {
    if (window.location.hash === "#moves") sectionEl?.scrollIntoView();
  });
  return (
    <section id="moves" ref={(el) => (sectionEl = el)} aria-labelledby="moves-heading" class="section">
      <h2 id="moves-heading">Moves</h2>
      <div class="game-control">
        <label for="game-select">Game</label>
        <Select id="game-select" value={props.selectedGame} onChange={(e) => props.onGameChange(e.currentTarget.value)}>
          <For each={props.games}>{(g) => <option value={g.name}>{g.label}</option>}</For>
        </Select>
      </div>
      <Show when={props.moves}>
        {(moves) => (
          <For each={moves().methods}>{(method) => <MovesTable method={method} />}</For>
        )}
      </Show>
    </section>
  );
}
