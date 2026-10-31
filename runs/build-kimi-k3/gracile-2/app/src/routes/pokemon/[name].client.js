// Progressive enhancement for the Pokémon page:
// - The Game select swaps the moves tables in place and updates the URL.
// - Column headers sort their table (aria-sort reflects the state).

const section = document.getElementById('moves');

if (section) {
	const select = document.getElementById('game-select');

	let requestId = 0;

	async function refresh(url) {
		const id = ++requestId;
		try {
			const res = await fetch(url);
			const text = await res.text();
			if (id !== requestId) return;
			const doc = new DOMParser().parseFromString(text, 'text/html');
			const next = doc.getElementById('moves-tables');
			const current = document.getElementById('moves-tables');
			if (next && current) current.replaceWith(next);
		} catch {
			window.location.href = url;
		}
	}

	if (select) {
		select.addEventListener('change', () => {
			const url = new URL(window.location.href);
			url.searchParams.set('game', select.value);
			window.history.pushState(null, '', url);
			refresh(url);
		});
	}

	window.addEventListener('popstate', () => {
		const params = new URLSearchParams(window.location.search);
		if (select && params.get('game')) select.value = params.get('game');
		refresh(window.location.href);
	});

	// Sortable tables (event delegation survives table swaps).
	section.addEventListener('click', (event) => {
		const button = event.target.closest('th button');
		if (!button || !section.contains(button)) return;
		const th = button.closest('th');
		const table = th.closest('table');
		if (!table) return;

		const headers = [...table.querySelectorAll('thead th')];
		const column = headers.indexOf(th);
		const numeric = th.dataset.sort === 'number';
		const direction =
			th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';

		const tbody = table.tBodies[0];
		if (!tbody) return;
		const rows = [...tbody.rows];
		const keyOf = (row) => row.cells[column]?.textContent.trim() ?? '';
		const isMissing = (value) => value === '' || value === '—';

		rows.sort((a, b) => {
			const av = keyOf(a);
			const bv = keyOf(b);
			const aMissing = isMissing(av);
			const bMissing = isMissing(bv);
			if (aMissing && bMissing) return 0;
			if (aMissing) return 1; // Missing values sort last in both directions.
			if (bMissing) return -1;
			const cmp = numeric
				? Number(av) - Number(bv)
				: av.localeCompare(bv, 'en');
			return direction === 'ascending' ? cmp : -cmp;
		});
		for (const row of rows) tbody.append(row);

		for (const header of headers) header.removeAttribute('aria-sort');
		th.setAttribute('aria-sort', direction);
	});
}
