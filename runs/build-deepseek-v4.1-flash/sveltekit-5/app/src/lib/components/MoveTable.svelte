<script>
	import { untrack } from 'svelte';
	import TypeBadge from './TypeBadge.svelte';

	let { table } = $props();

	const columns = $derived(
		table.hasLevel
			? [
					{ key: 'level', label: 'Level' },
					{ key: 'move', label: 'Move' },
					{ key: 'type', label: 'Type' },
					{ key: 'category', label: 'Category' },
					{ key: 'power', label: 'Power' },
					{ key: 'accuracy', label: 'Accuracy' },
					{ key: 'pp', label: 'PP' }
				]
			: [
					{ key: 'move', label: 'Move' },
					{ key: 'type', label: 'Type' },
					{ key: 'category', label: 'Category' },
					{ key: 'power', label: 'Power' },
					{ key: 'accuracy', label: 'Accuracy' },
					{ key: 'pp', label: 'PP' }
				]
	);

	let sortKey = $state(untrack(() => (table.hasLevel ? 'level' : 'move')));
	let direction = $state('ascending');

	const isMissing = (value) => value === null || value === undefined || value === '';

	function valueFor(row, key) {
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
				return '';
		}
	}

	const rows = $derived.by(() => {
		const copy = table.rows.slice();
		copy.sort((a, b) => {
			const aValue = valueFor(a, sortKey);
			const bValue = valueFor(b, sortKey);
			const aMissing = isMissing(aValue);
			const bMissing = isMissing(bValue);

			if (aMissing || bMissing) {
				if (aMissing && bMissing) return a.moveLabel.localeCompare(b.moveLabel);
				return aMissing ? 1 : -1;
			}

			let comparison;
			if (typeof aValue === 'number' && typeof bValue === 'number') {
				comparison = aValue - bValue;
			} else {
				comparison = String(aValue).localeCompare(String(bValue), 'en', { sensitivity: 'base' });
			}

			if (comparison === 0) {
				comparison = a.moveLabel.localeCompare(b.moveLabel, 'en', { sensitivity: 'base' });
			}

			return direction === 'ascending' ? comparison : -comparison;
		});
		return copy;
	});

	function toggleSort(key) {
		if (sortKey === key) {
			direction = direction === 'ascending' ? 'descending' : 'ascending';
		} else {
			sortKey = key;
			direction = 'ascending';
		}
	}

	const format = (value) => (isMissing(value) ? '—' : String(value));
</script>

<div class="table-scroll">
	<table class="data-table">
		<caption>{table.label}</caption>
		<thead>
			<tr>
				{#each columns as column}
					<th
						scope="col"
						aria-sort={sortKey === column.key ? direction : undefined}
					>
						<button type="button" onclick={() => toggleSort(column.key)}>{column.label}</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.moveName + ':' + (row.level ?? ''))}
				<tr>
					{#if table.hasLevel}
						<td class:missing={isMissing(row.level)}>{format(row.level)}</td>
					{/if}
					<td><a href="/moves/{row.moveName}">{row.moveLabel}</a></td>
					<td>
						<TypeBadge name={row.typeName} englishName={row.typeLabel} link />
					</td>
					<td>{row.category || '—'}</td>
					<td class:missing={isMissing(row.power)}>{format(row.power)}</td>
					<td class:missing={isMissing(row.accuracy)}>{format(row.accuracy)}</td>
					<td class:missing={isMissing(row.pp)}>{format(row.pp)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
