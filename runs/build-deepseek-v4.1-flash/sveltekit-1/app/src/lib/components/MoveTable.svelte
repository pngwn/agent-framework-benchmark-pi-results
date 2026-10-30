<script>
  import { displayValue } from '#lib/format.js';

  let { table } = $props();
  let sort = $state({ column: null, direction: 'ascending' });

  const labels = {
    level: 'Level',
    move: 'Move',
    type: 'Type',
    category: 'Category',
    power: 'Power',
    accuracy: 'Accuracy',
    pp: 'PP'
  };

  const columns = $derived(
    table.hasLevel
      ? ['level', 'move', 'type', 'category', 'power', 'accuracy', 'pp']
      : ['move', 'type', 'category', 'power', 'accuracy', 'pp']
  );

  function valueFor(row, column) {
    if (column === 'move') return row.moveLabel;
    if (column === 'type') return row.typeLabel || null;
    if (column === 'category') return row.categoryLabel === '—' ? null : row.categoryLabel;
    return row[column];
  }

  function compareRows(a, b, column, direction) {
    let av = valueFor(a, column);
    let bv = valueFor(b, column);
    const missingA = av === null || av === undefined || av === '';
    const missingB = bv === null || bv === undefined || bv === '';
    if (missingA && missingB) return 0;
    if (missingA) return 1;
    if (missingB) return -1;

    if (typeof av === 'number' && typeof bv === 'number') {
      return direction === 'descending' ? bv - av : av - bv;
    }

    const result = String(av).localeCompare(String(bv));
    return direction === 'descending' ? -result : result;
  }

  const rows = $derived.by(() => {
    if (!sort.column) return table.rows;
    return table.rows.slice().sort((a, b) => compareRows(a, b, sort.column, sort.direction));
  });

  function toggle(column) {
    sort = {
      column,
      direction: sort.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending'
    };
  }

  function ariaSort(column) {
    return sort.column === column ? sort.direction : 'none';
  }
</script>

<div class="table-scroll">
  <table class="moves-table" class:moves-table--level={table.hasLevel}>
    <caption>{table.label}</caption>
    <thead>
      <tr>
        {#each columns as column}
          <th scope="col" aria-sort={ariaSort(column)}>
            <button type="button" onclick={() => toggle(column)}>{labels[column]}</button>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row (`${row.method}-${row.move}-${row.level}`)}
        <tr>
          {#if table.hasLevel}
            <td>{row.level}</td>
          {/if}
          <td><a href={`/moves/${row.move}`}>{row.moveLabel}</a></td>
          <td>
            {#if row.type}
              <a class="type-badge type-{row.type}" href={`/types/${row.type}`}>{row.typeLabel}</a>
            {:else}
              —
            {/if}
          </td>
          <td>{row.categoryLabel}</td>
          <td>{displayValue(row.power)}</td>
          <td>{displayValue(row.accuracy)}</td>
          <td>{displayValue(row.pp)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
