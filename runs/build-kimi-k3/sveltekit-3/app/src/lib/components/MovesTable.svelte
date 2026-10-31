<script>
  let { title, showLevel = false, rows } = $props();

  let sortKey = $state(null);
  let sortDir = $state('ascending');

  const columns = $derived([
    ...(showLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' }
  ]);

  function value(row, key) {
    switch (key) {
      case 'level': return row.level;
      case 'move': return row.moveLabel;
      case 'type': return row.typeLabel;
      case 'category': return row.category;
      case 'power': return row.power;
      case 'accuracy': return row.accuracy;
      case 'pp': return row.pp;
    }
  }

  const sorted = $derived.by(() => {
    const list = [...rows];
    if (!sortKey) return list;
    const direction = sortDir === 'ascending' ? 1 : -1;
    // `rows` arrives pre-sorted in the table's default order and sort() is
    // stable, so ties keep the default order. Missing values always sort last.
    list.sort((a, b) => {
      const va = value(a, sortKey);
      const vb = value(b, sortKey);
      const missingA = va === null || va === undefined;
      const missingB = vb === null || vb === undefined;
      if (missingA && missingB) return 0;
      if (missingA) return 1;
      if (missingB) return -1;
      const result =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return result * direction;
    });
    return list;
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

<div class="table-wrap">
  <table>
    <caption>{title}</caption>
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th scope="col" aria-sort={sortKey === column.key ? sortDir : undefined}>
            <button type="button" onclick={() => toggleSort(column.key)}>{column.label}</button>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sorted as row (row)}
        <tr>
          {#if showLevel}<td>{row.level}</td>{/if}
          <td><a href="/moves/{row.moveName}">{row.moveLabel}</a></td>
          <td>
            {#if row.typeName}
              <a class="type-badge type-{row.typeName}" href="/types/{row.typeName}">{row.typeLabel}</a>
            {:else}
              —
            {/if}
          </td>
          <td>{row.category}</td>
          <td>{row.power ?? '—'}</td>
          <td>{row.accuracy ?? '—'}</td>
          <td>{row.pp ?? '—'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
