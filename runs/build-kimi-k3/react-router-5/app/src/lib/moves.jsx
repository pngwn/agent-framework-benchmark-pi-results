import { useState } from 'react';
import { Link } from 'react-router';

const COLUMNS = [
  { key: 'level', label: 'Level' },
  { key: 'en', label: 'Move' },
  { key: 'typeEn', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

const missing = (value) => (value == null ? '—' : value);

function MoveTable({ method }) {
  const showLevel = method.name === 'level-up';
  const columns = COLUMNS.filter((c) => c.key !== 'level' || showLevel);
  const [sort, setSort] = useState(null); // { key, dir } or null = default order

  let rows = method.rows;
  if (sort) {
    rows = rows.slice().sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      // Missing values always sort last.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === 'ascending' ? c : -c;
    });
  }

  const toggle = (key) =>
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === 'ascending' ? 'descending' : 'ascending' }
        : { key, dir: 'ascending' },
    );

  return (
    <table className="moves-table">
      <caption>{method.label}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              aria-sort={sort?.key === c.key ? sort.dir : undefined}
            >
              <button type="button" onClick={() => toggle(c.key)}>
                {c.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.name}-${r.level}-${i}`}>
            {showLevel ? <td className="num">{r.level}</td> : null}
            <td>
              <Link to={`/moves/${r.name}`}>{r.en}</Link>
            </td>
            <td>
              <Link to={`/types/${r.type}`} className={`type-badge type-${r.type}`}>
                {r.typeEn}
              </Link>
            </td>
            <td>{r.category}</td>
            <td className="num">{missing(r.power)}</td>
            <td className="num">{missing(r.accuracy)}</td>
            <td className="num">{missing(r.pp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MoveTables({ methods }) {
  return methods.map((m) => <MoveTable key={m.name} method={m} />);
}
