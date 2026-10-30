<script lang="ts">
	import { orDash } from '../format.ts';
	import type { MoveRow, MoveTable } from '../types.ts';
	import TypeBadge from './TypeBadge.svelte';

	let { table }: { table: MoveTable } = $props();

	type Key = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
	type Column = { key: Key; label: string; value: (row: MoveRow) => string | number | null };

	const ALL_COLUMNS: Column[] = [
		{ key: 'level', label: 'Level', value: (r) => r.level },
		{ key: 'move', label: 'Move', value: (r) => r.label },
		{ key: 'type', label: 'Type', value: (r) => r.type.label },
		{ key: 'category', label: 'Category', value: (r) => r.category },
		{ key: 'power', label: 'Power', value: (r) => r.power },
		{ key: 'accuracy', label: 'Accuracy', value: (r) => r.accuracy },
		{ key: 'pp', label: 'PP', value: (r) => r.pp }
	];

	const columns = $derived(
		table.method === 'level-up' ? ALL_COLUMNS : ALL_COLUMNS.filter((c) => c.key !== 'level')
	);

	// No explicit sort until a header is clicked; rows arrive in the default order.
	let sort = $state<{ key: Key; direction: 'ascending' | 'descending' } | null>(null);

	function toggle(key: Key) {
		sort =
			sort?.key === key
				? { key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' }
				: { key, direction: 'ascending' };
	}

	function compare(a: string | number | null, b: string | number | null): number {
		if (typeof a === 'number' && typeof b === 'number') return a - b;
		return String(a).localeCompare(String(b));
	}

	const rows = $derived.by(() => {
		if (!sort) return table.rows;
		const column = ALL_COLUMNS.find((c) => c.key === sort!.key)!;
		const sign = sort.direction === 'ascending' ? 1 : -1;
		return table.rows
			.map((row, index) => ({ row, index, value: column.value(row) }))
			.sort((a, b) => {
				const aMissing = a.value === null;
				const bMissing = b.value === null;
				// Missing values go last whichever way the column is sorted.
				if (aMissing !== bMissing) return aMissing ? 1 : -1;
				if (!aMissing) {
					const result = compare(a.value, b.value);
					if (result !== 0) return sign * result;
				}
				return a.index - b.index;
			})
			.map((entry) => entry.row);
	});
</script>

<div class="move-table">
	<table>
		<caption>{table.label}</caption>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th scope="col" aria-sort={sort?.key === column.key ? sort.direction : undefined}>
						<button type="button" onclick={() => toggle(column.key)}>
							{column.label}<span class="indicator" aria-hidden="true"
								>{sort?.key === column.key ? (sort.direction === 'ascending' ? '▲' : '▼') : ''}</span
							>
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (`${row.name}-${row.level}-${i}`)}
				<tr>
					{#if table.method === 'level-up'}
						<td>{orDash(row.level)}</td>
					{/if}
					<td><a href="/moves/{row.name}">{row.label}</a></td>
					<td><TypeBadge type={row.type} link /></td>
					<td>{orDash(row.category)}</td>
					<td>{orDash(row.power)}</td>
					<td>{orDash(row.accuracy)}</td>
					<td>{orDash(row.pp)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.move-table {
		overflow-x: auto;
	}

	.move-table + :global(.move-table) {
		margin-top: var(--space-5);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		white-space: nowrap;
	}

	caption {
		text-align: left;
		font-size: var(--text-base);
		padding-bottom: var(--space-2);
	}

	th {
		padding: 0;
		text-align: left;
		font-weight: var(--weight-normal);
		border-bottom: 1px solid var(--color-border);
	}

	th button {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: 0;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		text-align: left;
		cursor: pointer;
	}

	th button:hover {
		color: var(--color-text);
	}

	th[aria-sort] button {
		color: var(--color-text);
	}

	.indicator {
		display: inline-block;
		margin-left: var(--space-1);
		font-size: var(--text-xs);
	}

	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		height: 2.5625rem;
	}
</style>
