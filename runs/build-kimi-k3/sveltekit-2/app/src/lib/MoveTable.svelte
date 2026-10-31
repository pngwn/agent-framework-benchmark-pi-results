<script>
  let { label, hasLevel = false, rows } = $props();

  let sortKey = $state(hasLevel ? 'level' : 'move');
  let sortDir = $state('asc');

  const columns = $derived([
    ...(hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]);

  function valueOf(row, key) {
    switch (key) {
      case 'level':
        return row.level;
      case 'move':
        return row.moveLabel;
      case 'type':
        return row.typeLabel;
      case 'category':
        return row.category;
      case 'power':
        return row.power;
      case 'accuracy':
        return row.accuracy;
      case 'pp':
        return row.pp;
      default:
        return null;
    }
  }

  const sorted = $derived.by(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = valueOf(a, sortKey);
      const vb = valueOf(b, sortKey);
      const aMissing = va === null || va === undefined;
      const bMissing = vb === null || vb === undefined;
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1; // missing values sort last in both directions
      if (bMissing) return -1;
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      if (cmp !== 0) return cmp * dir;
      if (sortKey !== 'move') return a.moveLabel.localeCompare(b.moveLabel);
      return 0;
    });
  });

  function sortBy(key) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }
</script>

<table class="move-table">
  <caption>{label}</caption>
  <thead>
    <tr>
      {#each columns as col (col.key)}
        <th scope="col" aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
          <button type="button" class="th-button" data-sort onclick={() => sortBy(col.key)}>
            {col.label}{#if sortKey === col.key}<span aria-hidden="true">&nbsp;{sortDir === 'asc' ? '▲' : '▼'}</span>{/if}
          </button>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each sorted as row (row.moveName + '|' + row.level)}
      <tr>
        {#if hasLevel}<td>{row.level}</td>{/if}
        <td><a href="/moves/{row.moveName}">{row.moveLabel}</a></td>
        <td><a class="badge type-{row.typeName}" href="/types/{row.typeName}">{row.typeLabel}</a></td>
        <td>{row.category}</td>
        <td>{row.power ?? '—'}</td>
        <td>{row.accuracy ?? '—'}</td>
        <td>{row.pp ?? '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>
