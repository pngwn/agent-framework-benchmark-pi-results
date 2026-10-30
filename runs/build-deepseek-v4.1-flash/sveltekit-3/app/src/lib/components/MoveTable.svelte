<script>
	let { method } = $props();

	let sortKey = $state(null);
	let direction = $state('ascending');

	const defaultKey = $derived(method.showLevel ? 'level' : 'move');

	const columns = $derived([
		...(method.showLevel ? [{ key: 'level', label: 'Level' }] : []),
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
				return row.levelValue;
			case 'move':
				return row.moveSort;
			case 'type':
				return row.typeSort;
			case 'category':
				return row.categorySort;
			case 'power':
				return row.powerValue;
			case 'accuracy':
				return row.accuracyValue;
			case 'pp':
				return row.ppValue;
			default:
				return '';
		}
	}

	function compareRows(a, b, key, dir) {
		const aValue = valueFor(a, key);
		const bValue = valueFor(b, key);
		const aMissing = aValue === null || aValue === undefined;
		const bMissing = bValue === null || bValue === undefined;
		if (aMissing && bMissing) return a.moveSort.localeCompare(b.moveSort);
		if (aMissing) return 1;
		if (bMissing) return -1;

		let result;
		if (typeof aValue === 'number' && typeof bValue === 'number') {
			result = aValue - bValue;
		} else {
			result = String(aValue).localeCompare(String(bValue), undefined, {
				numeric: true,
				sensitivity: 'base'
			});
		}
		if (result !== 0) return dir === 'descending' ? -result : result;
		return a.moveSort.localeCompare(b.moveSort);
	}

	const sortedRows = $derived.by(() => {
		const key = sortKey ?? defaultKey;
		const dir = sortKey ? direction : 'ascending';
		return [...method.rows].sort((a, b) => compareRows(a, b, key, dir));
	});

	function toggleSort(key) {
		if (sortKey === key) {
			direction = direction === 'ascending' ? 'descending' : 'ascending';
		} else {
			sortKey = key;
			direction = 'ascending';
		}
	}
</script>

<table>
	<caption>{method.label}</caption>
	<thead>
		<tr>
			{#each columns as column (column.key)}
				<th
					scope="col"
					class="col-{column.key}"
					aria-sort={sortKey === column.key ? direction : undefined}
				>
					<button type="button" onclick={() => toggleSort(column.key)}>{column.label}</button>
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each sortedRows as row (row.moveName)}
			<tr>
				{#if method.showLevel}
					<td>{row.level}</td>
				{/if}
				<td><a href="/moves/{row.moveName}">{row.moveLabel}</a></td>
				<td>
					<a class="type-badge type-{row.typeName}" href="/types/{row.typeName}">{row.typeLabel}</a>
				</td>
				<td>{row.category}</td>
				<td>{row.power}</td>
				<td>{row.accuracy}</td>
				<td>{row.pp}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	caption {
		padding: 0 0 var(--space-2);
		color: var(--color-text);
		font-size: var(--text-base);
		font-weight: var(--weight-semibold);
		text-align: left;
	}

	th {
		padding: var(--space-2) var(--space-2);
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-weight: var(--weight-normal);
		text-align: left;
		white-space: nowrap;
	}

	th button {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	th button:hover {
		color: var(--color-link);
	}

	td {
		padding: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	.col-level {
		width: 10%;
	}

	.col-move {
		width: 18%;
	}

	.col-type {
		width: 15%;
	}

	.col-category {
		width: 13%;
	}

	.col-power,
	.col-accuracy,
	.col-pp {
		width: 10%;
	}

	td .type-badge {
		text-decoration: none;
	}
</style>
