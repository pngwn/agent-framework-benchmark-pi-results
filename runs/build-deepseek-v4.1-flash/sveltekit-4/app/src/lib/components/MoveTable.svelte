<script>
	let { table } = $props();

	let sortKey = $state('');
	let sortDirection = $state('ascending');

	const columns = $derived([
		...(table.hasLevel ? [{ key: 'level', label: 'Level' }] : []),
		{ key: 'move', label: 'Move' },
		{ key: 'type', label: 'Type' },
		{ key: 'category', label: 'Category' },
		{ key: 'power', label: 'Power' },
		{ key: 'accuracy', label: 'Accuracy' },
		{ key: 'pp', label: 'PP' }
	]);

	function valueFor(row, key) {
		switch (key) {
			case 'level':
				return row.level;
			case 'move':
				return row.moveDisplay;
			case 'type':
				return row.typeDisplay;
			case 'category':
				return row.categoryDisplay;
			case 'power':
				return row.powerSort;
			case 'accuracy':
				return row.accuracySort;
			case 'pp':
				return row.ppSort;
			default:
				return '';
		}
	}

	function compare(a, b, key, direction) {
		const aValue = valueFor(a, key);
		const bValue = valueFor(b, key);
		const aMissing = aValue === null || aValue === undefined || aValue === '';
		const bMissing = bValue === null || bValue === undefined || bValue === '';

		if (aMissing || bMissing) {
			if (aMissing && bMissing) return 0;
			return aMissing ? 1 : -1;
		}

		const result =
			typeof aValue === 'number' && typeof bValue === 'number'
				? aValue - bValue
				: String(aValue).localeCompare(String(bValue), undefined, { numeric: true });

		return direction === 'ascending' ? result : -result;
	}

	const sortedRows = $derived.by(() => {
		if (!sortKey) return table.rows;
		return [...table.rows].sort((a, b) => compare(a, b, sortKey, sortDirection));
	});

	function toggle(key) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
		} else {
			sortKey = key;
			sortDirection = 'ascending';
		}
	}
</script>

<div class="table-wrap">
	<table class="move-table">
		<caption>{table.caption}</caption>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th scope="col" aria-sort={sortKey === column.key ? sortDirection : undefined}>
						<button type="button" onclick={() => toggle(column.key)}>{column.label}</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedRows as row (row.move)}
				<tr>
					{#if table.hasLevel}
						<td>{row.level ?? '—'}</td>
					{/if}
					<td><a href={row.moveHref}>{row.moveDisplay}</a></td>
					<td>
						{#if row.type}
							<a class={`type-badge type-${row.type}`} href={`/types/${row.type}`}>
								{row.typeDisplay}
							</a>
						{:else}
							—
						{/if}
					</td>
					<td>{row.categoryDisplay}</td>
					<td>{row.power}</td>
					<td>{row.accuracy}</td>
					<td>{row.pp}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
