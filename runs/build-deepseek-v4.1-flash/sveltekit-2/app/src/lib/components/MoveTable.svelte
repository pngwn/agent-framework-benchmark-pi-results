<script>
	import { displayValue } from '#lib/format.js';
	import TypeBadge from './TypeBadge.svelte';

	let { label, showLevel = false, rows } = $props();

	const columns = $derived(
		[
			{ key: 'level', label: 'Level', numeric: true, visible: showLevel },
			{ key: 'moveLabel', label: 'Move', numeric: false, visible: true },
			{ key: 'typeLabel', label: 'Type', numeric: false, visible: true },
			{ key: 'category', label: 'Category', numeric: false, visible: true },
			{ key: 'power', label: 'Power', numeric: true, visible: true },
			{ key: 'accuracy', label: 'Accuracy', numeric: true, visible: true },
			{ key: 'pp', label: 'PP', numeric: true, visible: true }
		].filter((column) => column.visible)
	);

	let sortKey = $state(null);
	let direction = $state('ascending');

	const sortedRows = $derived.by(() => {
		if (!sortKey) return rows;
		const column = columns.find((entry) => entry.key === sortKey);
		if (!column) return rows;

		const present = [];
		const missing = [];
		for (const row of rows) {
			const value = row[sortKey];
			if (value === null || value === undefined || value === '') missing.push(row);
			else present.push({ row, value });
		}

		present.sort((a, b) => {
			let result;
			if (column.numeric) result = Number(a.value) - Number(b.value);
			else result = String(a.value).localeCompare(String(b.value));
			return direction === 'ascending' ? result : -result;
		});

		return [...present.map((entry) => entry.row), ...missing];
	});

	function toggle(key) {
		if (sortKey === key) {
			direction = direction === 'ascending' ? 'descending' : 'ascending';
		} else {
			sortKey = key;
			direction = 'ascending';
		}
	}
</script>

<div class="table-scroll">
	<table class="data-table moves-table">
		<caption>{label}</caption>
		<thead>
			<tr>
				{#each columns as column}
					<th
						scope="col"
						aria-sort={sortKey === column.key ? direction : undefined}
					>
						<button class="table-sort-button" type="button" onclick={() => toggle(column.key)}>
							{column.label}
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedRows as row (row.key)}
				<tr>
					{#if showLevel}
						<td>{displayValue(row.level)}</td>
					{/if}
					<td><a href={`/moves/${row.moveName}`}>{row.moveLabel}</a></td>
					<td>
						<TypeBadge name={row.typeName} label={row.typeLabel} href={`/types/${row.typeName}`} />
					</td>
					<td>{row.category}</td>
					<td>{displayValue(row.power)}</td>
					<td>{displayValue(row.accuracy)}</td>
					<td>{displayValue(row.pp)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.moves-table {
		min-width: 42rem;
		margin-top: var(--space-5);
	}

	.moves-table caption {
		padding-bottom: var(--space-2);
		font-size: var(--text-base);
		font-weight: var(--weight-normal);
		text-align: left;
	}

	.moves-table thead th {
		border-bottom: 1px solid var(--color-border);
	}

	.moves-table tbody tr:hover {
		background: transparent;
	}
</style>
