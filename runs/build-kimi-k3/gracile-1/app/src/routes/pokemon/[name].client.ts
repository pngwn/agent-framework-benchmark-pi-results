/**
 * Pokémon page interactivity:
 * - The Game select reflects its value in the `?game=` URL query.
 * - Every moves-table column header is sortable (ascending first, click
 *   again to flip). Missing values always sort last.
 */

const gameSelect = document.querySelector<HTMLSelectElement>('#game');
gameSelect?.addEventListener('change', () => {
	const url = new URL(window.location.href);
	url.search = `?game=${encodeURIComponent(gameSelect.value)}`;
	url.hash = '#moves';
	window.location.assign(url);
});

for (const table of document.querySelectorAll<HTMLTableElement>('table.moves-table')) {
	const headers = [...table.querySelectorAll<HTMLTableCellElement>('thead th')];
	for (const [columnIndex, header] of headers.entries()) {
		const button = header.querySelector('button');
		button?.addEventListener('click', () => {
			const direction =
				header.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
			for (const other of headers) other.removeAttribute('aria-sort');
			header.setAttribute('aria-sort', direction);

			const body = table.tBodies[0];
			if (!body) return;
			const rows = [...body.rows];
			const sign = direction === 'ascending' ? 1 : -1;
			rows.sort((rowA, rowB) => {
				const a = rowA.cells[columnIndex];
				const b = rowB.cells[columnIndex];
				if (!a || !b) return 0;
				const aMissing = a.hasAttribute('data-missing');
				const bMissing = b.hasAttribute('data-missing');
				if (aMissing && bMissing) return 0;
				// Missing values sort last in both directions.
				if (aMissing) return 1;
				if (bMissing) return -1;
				const aValue = a.getAttribute('data-v') ?? a.textContent ?? '';
				const bValue = b.getAttribute('data-v') ?? b.textContent ?? '';
				const comparison = a.hasAttribute('data-n')
					? Number(aValue) - Number(bValue)
					: aValue.localeCompare(bValue);
				return comparison * sign;
			});
			for (const row of rows) body.appendChild(row);
		});
	}
}
