import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { EvolutionList, NotFoundPage, Section } from '../components';
import { getPokemonPage } from '../lib/api.server';
import { humanize, valueOrDash } from '../lib/format';

export async function loader({ params, request }: any) {
  const url = new URL(request.url);
  const data = await getPokemonPage(params.name, url.searchParams.get('game'));
  return data ?? { notFound: true as const };
}

export function meta({ loaderData }: any) {
  return [
    {
      title: loaderData?.notFound
        ? 'Not found – Pokédex'
        : `${loaderData.displayName} – Pokédex`,
    },
  ];
}

type MoveRow = {
  level: number;
  moveName: string;
  moveLabel: string;
  type: { name: string; english: string };
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type Column = {
  key: keyof MoveRow;
  label: string;
  numeric?: boolean;
};

const methodOrder = ['level-up', 'machine', 'egg', 'tutor'];

export default function PokemonPage({ loaderData }: any) {
  const data = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  if (data.notFound) return <NotFoundPage />;

  const tables = [...data.tables].sort((a, b) => {
    const aIndex = methodOrder.indexOf(a.method);
    const bIndex = methodOrder.indexOf(b.method);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.label.localeCompare(b.label);
  });

  function selectGame(game: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (game) next.set('game', game);
        else next.delete('game');
        return next;
      },
      { preventScrollReset: true },
    );
  }

  return (
    <>
      <div className="pokemon-summary">
        <img
          className="artwork"
          src={data.artwork}
          alt={data.displayName}
          width={288}
          height={288}
        />
        <div className="summary-details">
          <h1>{data.displayName}</h1>
          <p className="dex-number">#{String(data.id).padStart(4, '0')}</p>
          <p className="genus">{data.genus}</p>
          <p className="type-list">
            {data.types.map((type: any) => (
              <Link
                key={type.name}
                className={`type-badge type-${type.name}`}
                to={`/types/${type.name}`}
              >
                {type.english}
              </Link>
            ))}
          </p>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{data.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight} kg</dd>
            </div>
          </dl>
          <p className="flavor">{data.flavor}</p>
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {data.stats.map((stat: any) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td>
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-track">
                    <span
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (stat.value / 200) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td>
                <span className="stat-value">{data.statsTotal}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {data.abilities.map((ability: any) => (
            <li key={ability.name}>
              <Link to={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {data.evolution ? <EvolutionList nodes={[data.evolution]} /> : null}
      </Section>

      <Section id="moves" title="Moves">
        <div className="moves-controls">
          <label htmlFor="game-select">Game</label>
          <select
            id="game-select"
            value={data.selectedGroup ?? ''}
            onChange={(event) => selectGame(event.target.value)}
          >
            {data.groups.map((group: any) => (
              <option key={group.name} value={group.name}>
                {group.label}
              </option>
            ))}
          </select>
        </div>

        {tables.map((table: any) => (
          <MovesTable
            key={`${data.selectedGroup}-${table.method}`}
            method={table.method}
            label={table.label}
            rows={table.rows}
          />
        ))}
      </Section>
    </>
  );
}

function MovesTable({
  method,
  label,
  rows,
}: {
  method: string;
  label: string;
  rows: MoveRow[];
}) {
  const isLevelUp = method === 'level-up';
  const columns: Column[] = [
    ...(isLevelUp ? [{ key: 'level' as const, label: 'Level', numeric: true }] : []),
    { key: 'moveLabel', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power', numeric: true },
    { key: 'accuracy', label: 'Accuracy', numeric: true },
    { key: 'pp', label: 'PP', numeric: true },
  ];
  const [sort, setSort] = useState<{ key: keyof MoveRow; direction: 'ascending' | 'descending' } | null>(null);

  function valueFor(row: MoveRow, key: keyof MoveRow): string | number | null {
    if (key === 'type') return row.type.english;
    return row[key] as string | number | null;
  }

  function clickColumn(key: keyof MoveRow) {
    setSort((previous) => {
      if (previous?.key === key) {
        return {
          key,
          direction:
            previous.direction === 'ascending' ? 'descending' : 'ascending',
        };
      }
      return { key, direction: 'ascending' };
    });
  }

  const sortedRows = [...rows].sort((a, b) => {
    const active = sort ?? {
      key: isLevelUp ? ('level' as const) : ('moveLabel' as const),
      direction: 'ascending' as const,
    };
    const aValue = valueFor(a, active.key);
    const bValue = valueFor(b, active.key);
    const aMissing = aValue === null || aValue === undefined || aValue === '';
    const bMissing = bValue === null || bValue === undefined || bValue === '';
    if (aMissing || bMissing) {
      if (aMissing && bMissing) return a.moveLabel.localeCompare(b.moveLabel);
      return aMissing ? 1 : -1;
    }
    let comparison = 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    if (comparison === 0) comparison = a.moveLabel.localeCompare(b.moveLabel);
    return active.direction === 'ascending' ? comparison : -comparison;
  });

  return (
    <div className="moves-table-block">
      <table className="moves-table">
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  sort?.key === column.key ? sort.direction : undefined
                }
              >
                <button type="button" onClick={() => clickColumn(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={`${row.moveName}-${row.level}-${index}`}>
              {isLevelUp ? <td>{row.level}</td> : null}
              <td>
                <Link to={`/moves/${row.moveName}`}>{row.moveLabel}</Link>
              </td>
              <td>
                <Link
                  className={`type-badge type-${row.type.name}`}
                  to={`/types/${row.type.name}`}
                >
                  {row.type.english}
                </Link>
              </td>
              <td>{row.category}</td>
              <td>{valueOrDash(row.power)}</td>
              <td>{valueOrDash(row.accuracy)}</td>
              <td>{valueOrDash(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
