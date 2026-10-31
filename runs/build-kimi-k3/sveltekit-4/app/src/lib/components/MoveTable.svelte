<script>
	/**
	 * One learn-method table in a Pokémon's Moves section.
	 * `table`: { method, label, rows: [{ level, move, moveLabel, type, typeLabel, category, power, accuracy, pp }] }
	 */
	let { table } = $props();

	let hasLevel = $derived(table.method === 'level-up');

	let columns = $derived([
		...(hasLevel ? [{ key: 'level', label: 'Level' }] : []),
		{ key: 'move', label: 'Move' },
		{ key: 'type', label: 'Type' },
		{ key: 'category', label: 'Category' },
		{ key: 'power', label: 'Power' },
		{ key: 'accuracy', label: 'Accuracy' },
		{ key: 'pp', label: 'PP' }
	]);

	function valueOf(row, key) {
		switch (key) {
			case 'level':
				return row.level;
			case 'move':
				return row.moveLabel;
			case 'type':
				return row.type ? row.typeLabel : null;
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

	// `undefined` until the user clicks a header: the default sort is Level Up
	// by level (then move name), other methods by move name.
	let sortOverride = $state();
	let sortKey = $derived(sortOverride ?? (hasLevel ? 'level' : 'move'));
	let sortDir = $state('ascending');

	function toggleSort(key) {
		if (sortKey === key) {
			sortDir = sortDir === 'ascending' ? 'descending' : 'ascending';
		} else {
			sortOverride = key;
			sortDir = 'ascending';
		}
	}

	function tiebreak(a, b) {
		return a.moveLabel.localeCompare(b.moveLabel) || a.move.localeCompare(b.move) || a.level - b.level;
	}

	let rows = $derived.by(() => {
		const dir = sortDir === 'ascending' ? 1 : -1;
		const key = sortOverride ?? (hasLevel ? 'level' : 'move');
		return [...table.rows].sort((a, b) => {
			const va = valueOf(a, key);
			const vb = valueOf(b, key);
			// Missing values sort last in both directions.
			if (va == null && vb == null) return tiebreak(a, b);
			if (va == null) return 1;
			if (vb == null) return -1;
			let cmp;
			if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
			else cmp = String(va).localeCompare(String(vb));
			if (cmp === 0) return tiebreak(a, b);
			return cmp * dir;
		});
	});
</script>

<table class="move-table">
	<caption>{table.label}</caption>
	<thead>
		<tr>
			{#each columns as column (column.key)}
				<th scope="col" aria-sort={sortKey === column.key ? sortDir : undefined}>
					<button type="button" class="sort-button" onclick={() => toggleSort(column.key)}>
						{column.label}
					</button>
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.method + row.move + row.level)}
			<tr>
				{#if hasLevel}
					<td>{row.level}</td>
				{/if}
				<td><a href="/moves/{row.move}">{row.moveLabel}</a></td>
				<td>
					{#if row.type}
						<a class="pill" style:--pill-bg="var(--type-{row.type}, var(--color-border))" href="/types/{row.type}">
							{row.typeLabel}
						</a>
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
