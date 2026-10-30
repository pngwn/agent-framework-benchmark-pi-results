'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const COLUMNS = [
  { key: 'level', label: 'Level', numeric: true, level: true },
  { key: 'moveName', label: 'Move' },
  { key: 'typeEnglish', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
];

function isMissing(value) {
  return value === null || value === undefined || value === '';
}

function compareRows(a, b, column, direction) {
  const av = a[column.key];
  const bv = b[column.key];
  if (isMissing(av) && isMissing(bv)) return 0;
  if (isMissing(av)) return 1;
  if (isMissing(bv)) return -1;
  const multiplier = direction === 'descending' ? -1 : 1;
  let result;
  if (column.numeric) {
    result = Number(av) - Number(bv);
  } else {
    result = String(av).localeCompare(String(bv), 'en');
  }
  return result * multiplier;
}

export default function SortableMoveTable({ caption, rows, hasLevel }) {
  const columns = COLUMNS.filter((column) => !column.level || hasLevel);
  const [sort, setSort] = useState({
    key: hasLevel ? 'level' : 'moveName',
    direction: 'ascending',
  });

  const activeColumn = columns.find((column) => column.key === sort.key) ?? columns[0];
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const primary = compareRows(a, b, activeColumn, sort.direction);
      if (primary !== 0) return primary;
      if (activeColumn.key !== 'moveName') {
        return String(a.moveName).localeCompare(String(b.moveName), 'en');
      }
      return 0;
    });
  }, [rows, activeColumn, sort.direction]);

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
        : { key, direction: 'ascending' },
    );
  };

  return (
    <div className="table-wrap">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                {...(sort.key === column.key ? { 'aria-sort': sort.direction } : {})}
              >
                <button type="button" onClick={() => toggleSort(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={`${row.id}-${index}`}>
              {hasLevel ? <td>{row.level}</td> : null}
              <td>
                <Link href={`/moves/${row.moveApiName}`}>{row.moveName}</Link>
              </td>
              <td>
                <Link href={`/types/${row.typeName}`} className={`type-pill type-${row.typeName}`}>
                  {row.typeEnglish}
                </Link>
              </td>
              <td>{row.category}</td>
              <td>{isMissing(row.power) ? '—' : row.power}</td>
              <td>{isMissing(row.accuracy) ? '—' : row.accuracy}</td>
              <td>{isMissing(row.pp) ? '—' : row.pp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
