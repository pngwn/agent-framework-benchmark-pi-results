<script>
  /**
   * One learn-method move table with sortable column headers.
   * rows: [{ level, move, moveHref, type, typeName, typeHref, category, power, accuracy, pp }]
   */
  let { caption, hasLevel, rows } = $props();

  let sortKey = $state(null);
  let sortDir = $state('ascending');

  const columns = $derived([
    ...(hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' }
  ]);

  function compare(x, y, dir) {
    // Missing values always sort last, in both directions.
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  }

  const sortedRows = $derived.by(() => {
    if (!sortKey) return rows;
    const dir = sortDir === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => compare(a[sortKey], b[sortKey], dir));
  });

  function toggleSort(key) {
    if (sortKey === key) {
      sortDir = sortDir === 'ascending' ? 'descending' : 'ascending';
    } else {
      sortKey = key;
      sortDir = 'ascending';
    }
  }
</script>

<table class="move-table">
  <caption>{caption}</caption>
  <thead>
    <tr>
      {#each columns as column (column.key)}
        <th scope="col" aria-sort={sortKey === column.key ? sortDir : undefined}>
          <button type="button" class="sort-button" onclick={() => toggleSort(column.key)}>
            {column.label}{#if sortKey === column.key}<span class="sort-arrow" aria-hidden="true">{sortDir === 'ascending' ? '▲' : '▼'}</span>{/if}
          </button>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each sortedRows as row (row.moveHref + ':' + row.level)}
      <tr>
        {#if hasLevel}
          <td class="num">{row.level ?? '—'}</td>
        {/if}
        <td><a href={row.moveHref}>{row.move}</a></td>
        <td>
          {#if row.typeHref}
            <a class="type-badge" style:background-color="var(--type-{row.typeName})" href={row.typeHref}>{row.type}</a>
          {:else}
            {row.type}
          {/if}
        </td>
        <td>{row.category}</td>
        <td class="num">{row.power ?? '—'}</td>
        <td class="num">{row.accuracy ?? '—'}</td>
        <td class="num">{row.pp ?? '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .move-table {
    margin-bottom: var(--space-5);
  }

  .move-table th,
  .move-table td {
    white-space: nowrap;
  }

  .move-table:last-child {
    margin-bottom: 0;
  }
</style>
