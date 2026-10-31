<script>
	let { label, showLevel = false, rows } = $props();

	let columns = $derived([
		...(showLevel ? [{ key: 'level', label: 'Level' }] : []),
		{ key: 'move', label: 'Move' },
		{ key: 'type', label: 'Type' },
		{ key: 'category', label: 'Category' },
		{ key: 'power', label: 'Power' },
		{ key: 'accuracy', label: 'Accuracy' },
		{ key: 'pp', label: 'PP' }
	]);

	// null until the user sorts: the server-provided default order applies.
	let sort = $state(null);

	const accessors = {
		level: (r) => r.level,
		move: (r) => r.moveEn,
		type: (r) => r.typeEn,
		category: (r) => r.category,
		power: (r) => r.power,
		accuracy: (r) => r.accuracy,
		pp: (r) => r.pp
	};

	let sortedRows = $derived.by(() => {
		if (!sort) return rows;
		const value = accessors[sort.key];
		return [...rows].sort((a, b) => {
			const va = value(a);
			const vb = value(b);
			// Missing values sort last in both directions.
			if (va == null && vb == null) return 0;
			if (va == null) return 1;
			if (vb == null) return -1;
			const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
			return sort.dir === 'ascending' ? cmp : -cmp;
		});
	});

	function toggle(key) {
		if (sort?.key === key) {
			sort = { key, dir: sort.dir === 'ascending' ? 'descending' : 'ascending' };
		} else {
			sort = { key, dir: 'ascending' };
		}
	}
</script>

<div class="table-wrap">
	<table>
		<caption>{label}</caption>
		<thead>
			<tr>
				{#each columns as col (col.key)}
					<th scope="col" aria-sort={sort?.key === col.key ? sort.dir : undefined}>
						<button type="button" onclick={() => toggle(col.key)}>{col.label}</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedRows as row (row.move)}
				<tr>
					{#if showLevel}
						<td>{row.level}</td>
					{/if}
					<td><a href="/moves/{row.move}">{row.moveEn}</a></td>
					<td><a class="badge type-{row.type}" href="/types/{row.type}">{row.typeEn}</a></td>
					<td>{row.category}</td>
					<td>{row.power ?? '—'}</td>
					<td>{row.accuracy ?? '—'}</td>
					<td>{row.pp ?? '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
