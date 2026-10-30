/**
 * Makes a server-rendered table sortable by clicking its column header buttons.
 * Cells carry their sort key in `data-sort`; headers mark numeric columns with
 * `data-numeric="true"`. Missing values (empty keys) always sort last.
 */
class SortableTable extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', (event) => {
			const button = (event.target as Element).closest('th button');
			const th = button?.closest('th');
			if (th && this.contains(th)) this.#sort(th);
		});
	}

	#sort(th: HTMLTableCellElement) {
		const table = th.closest('table');
		const tbody = table?.tBodies[0];
		if (!table || !tbody) return;

		const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
		for (const header of table.querySelectorAll('thead th')) header.removeAttribute('aria-sort');
		th.setAttribute('aria-sort', direction);

		const index = th.cellIndex;
		const numeric = th.dataset['numeric'] === 'true';
		const sign = direction === 'ascending' ? 1 : -1;
		const key = (row: HTMLTableRowElement) => row.cells[index]?.dataset['sort'] ?? '';

		const rows = [...tbody.rows].sort((a, b) => {
			const x = key(a);
			const y = key(b);
			if (!x || !y) return x === y ? 0 : x ? -1 : 1;
			const order = numeric ? Number(x) - Number(y) : x.localeCompare(y);
			return order * sign;
		});
		tbody.append(...rows);
	}
}

customElements.define('sortable-table', SortableTable);
