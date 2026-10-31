import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import { getPokemonPageData } from "~/lib/queries";
import { dexNumber, displayValue, humanize, statLabel } from "~/lib/util";

export const route = {
  preload: ({ params }) => getPokemonPageData(params.name),
} satisfies RouteDefinition;

export default function PokemonPage(props: { params: { name: string } }) {
  const data = createAsync(() => getPokemonPageData(props.params.name));
  return (
    <Show when={data()} fallback={<Show when={data() === null}><NotFound /></Show>}>
      {(d) => <PokemonDetail data={d()} />}
    </Show>
  );
}

function EvoNode(props: { node: any }) {
  return (
    <li>
      <A href={`/pokemon/${props.node.name}`}>{humanize(props.node.name)}</A>
      <Show when={props.node.children?.length}>
        <ul>
          <For each={props.node.children}>{(c: any) => <EvoNode node={c} />}</For>
        </ul>
      </Show>
    </li>
  );
}

function PokemonDetail(props: { data: any }) {
  const d = () => props.data;
  const total = createMemo(() => d().stats.reduce((sum: number, s: any) => sum + s.base, 0));
  const barWidth = (value: number, max: number) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  return (
    <>
      <Title>{`${d().en} – Pokédex`}</Title>
      <div class="summary">
        <div class="artwork-card">
          <Show when={d().artwork}>
            <img src={d().artwork} alt={d().en} width="288" height="288" />
          </Show>
        </div>
        <div class="summary-info">
          <p class="dex">{dexNumber(d().id)}</p>
          <h1>{d().en}</h1>
          <Show when={d().genus}>
            <p class="genus">{d().genus}</p>
          </Show>
          <p class="type-list">
            <For each={d().types}>
              {(t: any) => (
                <A href={`/types/${t.name}`} class="type-badge" data-type={t.name}>
                  {t.en}
                </A>
              )}
            </For>
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{(d().height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(d().weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          <p class="flavor">{d().flavor ?? "—"}</p>
        </div>
      </div>

      <section class="section" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            <For each={d().stats}>
              {(s: any) => (
                <tr>
                  <th scope="row">{statLabel(s.name)}</th>
                  <td class="stat-value">{s.base}</td>
                  <td class="stat-bar-cell">
                    <span class="stat-track">
                      <span class="stat-fill" style={{ width: barWidth(s.base, 255) }} />
                    </span>
                  </td>
                </tr>
              )}
            </For>
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">{total()}</td>
              <td class="stat-bar-cell">
                <span class="stat-track">
                  <span
                    class="stat-fill"
                    style={{ width: barWidth(total(), 255 * d().stats.length) }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="link-list">
          <For each={d().abilities}>
            {(a: any) => (
              <li>
                <A href={`/abilities/${a.name}`}>{humanize(a.name)}</A>
                <Show when={a.hidden}>{" (hidden)"}</Show>
              </li>
            )}
          </For>
        </ul>
      </section>

      <Show when={d().evolution}>
        <section class="section" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          <ul class="evo-tree">
            <EvoNode node={d().evolution} />
          </ul>
        </section>
      </Show>

      <section class="section" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <MovesSection data={d()} />
      </section>
    </>
  );
}

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

function MovesSection(props: { data: any }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const games = () => props.data.versionGroups as { name: string; order: number }[];
  const selected = () => {
    const g = typeof searchParams.game === "string" ? searchParams.game : "";
    const list = games();
    return list.some((v) => v.name === g) ? g : (list[list.length - 1]?.name ?? "");
  };

  const tables = createMemo(() => {
    const game = selected();
    const byMethod = new Map<string, any[]>();
    for (const m of props.data.moves as any[]) {
      const seen = new Set<string>();
      for (const det of m.details as any[]) {
        if (det.vg !== game) continue;
        const key = `${det.method}|${det.level}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let rows = byMethod.get(det.method);
        if (!rows) byMethod.set(det.method, (rows = []));
        rows.push({
          level: det.level,
          name: m.name,
          en: m.en,
          type: m.type,
          typeEn: m.typeEn,
          category: m.damageClass ? humanize(m.damageClass) : null,
          power: m.power,
          accuracy: m.accuracy,
          pp: m.pp,
        });
      }
    }
    const methods = [...byMethod.keys()].sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a);
      const ib = METHOD_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return humanize(a).localeCompare(humanize(b));
    });
    return methods.map((method) => {
      const rows = byMethod.get(method)!;
      rows.sort(
        method === "level-up"
          ? (a, b) => a.level - b.level || a.en.localeCompare(b.en)
          : (a, b) => a.en.localeCompare(b.en),
      );
      return { method, label: humanize(method), rows };
    });
  });

  return (
    <>
      <div class="control game-control">
        <label for="game-select">Game</label>
        <select
          id="game-select"
          value={selected()}
          onChange={(e) => setSearchParams({ game: e.currentTarget.value })}
        >
          <For each={games()}>
            {(g) => (
              <option value={g.name} selected={selected() === g.name}>
                {humanize(g.name)}
              </option>
            )}
          </For>
        </select>
      </div>
      <For each={tables()}>{(t) => <MoveTable table={t} />}</For>
    </>
  );
}

const COLUMNS = [
  { key: "level", label: "Level" },
  { key: "en", label: "Move" },
  { key: "typeEn", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function MoveTable(props: { table: any }) {
  const showLevel = () => props.table.method === "level-up";
  const cols = () => COLUMNS.filter((c) => showLevel() || c.key !== "level");
  const [sortKey, setSortKey] = createSignal<string | null>(null);
  const [sortDir, setSortDir] = createSignal<"ascending" | "descending">("ascending");

  const rows = createMemo(() => {
    const key = sortKey();
    const base = props.table.rows as any[];
    if (!key) return base;
    const dir = sortDir() === "ascending" ? 1 : -1;
    return [...base].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      const ma = va === null || va === undefined;
      const mb = vb === null || vb === undefined;
      if (ma && mb) return 0;
      if (ma) return 1;
      if (mb) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  });

  const onSort = (key: string) => {
    if (sortKey() === key) {
      setSortDir((d) => (d === "ascending" ? "descending" : "ascending"));
    } else {
      setSortKey(key);
      setSortDir("ascending");
    }
  };

  return (
    <table class="moves-table">
      <caption>{props.table.label}</caption>
      <thead>
        <tr>
          <For each={cols()}>
            {(c) => (
              <th scope="col" aria-sort={sortKey() === c.key ? sortDir() : undefined}>
                <button type="button" onClick={() => onSort(c.key)}>
                  {c.label}
                </button>
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={rows()}>
          {(r) => (
            <tr>
              <Show when={showLevel()}>
                <td>{r.level}</td>
              </Show>
              <td>
                <A href={`/moves/${r.name}`}>{r.en}</A>
              </td>
              <td>
                <Show when={r.type}>
                  <A href={`/types/${r.type}`} class="type-badge" data-type={r.type}>
                    {r.typeEn}
                  </A>
                </Show>
              </td>
              <td>{r.category ?? "—"}</td>
              <td>{displayValue(r.power)}</td>
              <td>{displayValue(r.accuracy)}</td>
              <td>{displayValue(r.pp)}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
