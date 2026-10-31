import { createMemo, createSignal, For } from "solid-js";
import { A, useLocation, useNavigate } from "@solidjs/router";
import Section from "./Section";
import { TypeBadgeLink } from "./Badge";
import { emDash } from "~/lib/format";

interface MoveRow {
  level: number;
  move: string;
  moveEn: string;
  type: string | null;
  typeEn: string | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveTableData {
  method: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
}

type SortDir = "ascending" | "descending";

function MoveTable(props: { table: MoveTableData }) {
  const [sort, setSort] = createSignal<{ col: string; dir: SortDir } | null>(null);

  const rows = createMemo(() => {
    const s = sort();
    if (!s) return props.table.rows;
    const dir = s.dir === "ascending" ? 1 : -1;
    return [...props.table.rows].sort((a, b) => {
      const va = (a as any)[s.col];
      const vb = (b as any)[s.col];
      const ma = va === null || va === undefined;
      const mb = vb === null || vb === undefined;
      if (ma && mb) return 0;
      if (ma) return 1; // missing values always sort last
      if (mb) return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return cmp * dir;
    });
  });

  const toggle = (col: string) =>
    setSort((s) =>
      s?.col === col
        ? { col, dir: s.dir === "ascending" ? "descending" : "ascending" }
        : { col, dir: "ascending" },
    );

  const ariaSort = (col: string) => (sort()?.col === col ? sort()!.dir : undefined);

  const Header = (p: { col: string; label: string }) => (
    <th aria-sort={ariaSort(p.col)}>
      <button type="button" onClick={() => toggle(p.col)}>
        {p.label}
      </button>
    </th>
  );

  return (
    <table class="moves-table">
      <caption>{props.table.label}</caption>
      <thead>
        <tr>
          {props.table.hasLevel ? <Header col="level" label="Level" /> : null}
          <Header col="moveEn" label="Move" />
          <Header col="typeEn" label="Type" />
          <Header col="category" label="Category" />
          <Header col="power" label="Power" />
          <Header col="accuracy" label="Accuracy" />
          <Header col="pp" label="PP" />
        </tr>
      </thead>
      <tbody>
        <For each={rows()}>
          {(row) => (
            <tr>
              {props.table.hasLevel ? <td>{row.level}</td> : null}
              <td>
                <A href={`/moves/${row.move}`}>{row.moveEn}</A>
              </td>
              <td>
                {row.type && row.typeEn ? (
                  <TypeBadgeLink name={row.type} label={row.typeEn} />
                ) : (
                  "—"
                )}
              </td>
              <td>{row.category ?? "—"}</td>
              <td>{emDash(row.power)}</td>
              <td>{emDash(row.accuracy)}</td>
              <td>{emDash(row.pp)}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

export default function MovesSection(props: {
  games: { name: string; label: string }[];
  selectedGame: string;
  tables: MoveTableData[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Section id="moves" title="Moves">
      <div class="field game-field">
        <label for="game-select">Game</label>
        <select
          id="game-select"
          onChange={(e) =>
            navigate(`${location.pathname}?game=${encodeURIComponent(e.currentTarget.value)}`, {
              scroll: false,
            })
          }
        >
          <For each={props.games}>
            {(g) => (
              <option value={g.name} selected={g.name === props.selectedGame}>
                {g.label}
              </option>
            )}
          </For>
        </select>
      </div>
      <For each={props.tables}>{(table) => <MoveTable table={table} />}</For>
    </Section>
  );
}
