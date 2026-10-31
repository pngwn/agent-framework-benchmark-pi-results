/**
 * Pokémon page interactivity:
 * - sortable moves tables (aria-sort + row reordering)
 * - the Game select, which navigates to the corresponding `?game=` URL
 */

const EM_DASH = '—';

function cellValue(row: HTMLTableRowElement, index: number): string {
	return row.cells.item(index)?.textContent?.trim() ?? '';
}

function compareValues(
	a: string,
	b: string,
	numeric: boolean,
	direction: 'ascending' | 'descending',
): number {
	const aMissing = a === EM_DASH || a === '';
	const bMissing = b === EM_DASH || b === '';
	// Missing values always sort last, in both directions.
	if (aMissing && bMissing) return 0;
	if (aMissing) return 1;
	if (bMissing) return -1;
	const result = numeric
		? Number(a) - Number(b)
		: a.localeCompare(b, undefined, { numeric: true });
	return direction === 'ascending' ? result : -result;
}

for (const table of document.querySelectorAll<HTMLTableElement>(
	'.moves-table',
)) {
	const head = table.tHead;
	const body = table.tBodies[0];
	if (!head || !body) continue;
	const headers = [...head.rows[0]!.cells] as HTMLTableCellElement[];

	headers.forEach((header, columnIndex) => {
		const trigger = header.querySelector('button') ?? header;
		trigger.addEventListener('click', () => {
			const direction =
				header.getAttribute('aria-sort') === 'ascending'
					? 'descending'
					: 'ascending';
			const numeric = header.dataset.sortType === 'num';

			const rows = [...body.rows] as HTMLTableRowElement[];
			rows.sort((rowA, rowB) =>
				compareValues(
					cellValue(rowA, columnIndex),
					cellValue(rowB, columnIndex),
					numeric,
					direction,
				),
			);
			for (const row of rows) body.append(row);

			for (const other of headers) other.removeAttribute('aria-sort');
			header.setAttribute('aria-sort', direction);
		});
	});
}

const gameSelect = document.getElementById('game-select');
gameSelect?.addEventListener('change', () => {
	const value = (gameSelect as HTMLSelectElement).value;
	const url = new URL(window.location.href);
	url.searchParams.set('game', value);
	url.hash = 'moves';
	window.location.assign(url);
});
