import { LitElement, html, nothing } from 'lit';
import { isServer } from 'lit';

import { islandStyles } from './island-styles.js';

interface MoveRow {
	level: number | null;
	moveName: string;
	moveLabel: string;
	typeName: string;
	typeLabel: string;
	category: string;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

interface MoveTableData {
	key: string;
	name: string;
	hasLevel: boolean;
	rows: MoveRow[];
}

interface NamedOption {
	name: string;
	label: string;
}

interface Column {
	key: keyof MoveRow;
	label: string;
	numeric?: boolean;
}

const COLUMNS: Column[] = [
	{ key: 'level', label: 'Level', numeric: true },
	{ key: 'moveLabel', label: 'Move' },
	{ key: 'typeLabel', label: 'Type' },
	{ key: 'category', label: 'Category' },
	{ key: 'power', label: 'Power', numeric: true },
	{ key: 'accuracy', label: 'Accuracy', numeric: true },
	{ key: 'pp', label: 'PP', numeric: true },
];

const EM_DASH = '—';

type SortDirection = 'ascending' | 'descending';

/**
 * The moves section of a Pokémon page: a game (version group) picker and one
 * sortable table per learn method. Changing the game navigates (server-side
 * rendering); sorting happens client-side.
 */
export class MoveExplorer extends LitElement {
	static override properties = {
		base: { type: String },
		groups: { type: Array },
		selected: { type: String },
		tables: { type: Array },
	};

	static override styles = islandStyles;

	base = '';
	groups: NamedOption[] = [];
	selected = '';
	tables: MoveTableData[] = [];

	/** Per-table sort state (client-side only, not reflected in the URL). */
	#sorts = new Map<number, { key: keyof MoveRow; direction: SortDirection }>();

	#onGameChange(event: Event) {
		if (isServer) return;
		const game = (event.target as HTMLSelectElement).value;
		window.location.assign(`${this.base}?game=${encodeURIComponent(game)}#moves`);
	}

	#toggleSort(tableIndex: number, column: Column) {
		const current = this.#sorts.get(tableIndex);
		const direction: SortDirection =
			current?.key === column.key && current.direction === 'ascending'
				? 'descending'
				: 'ascending';
		this.#sorts.set(tableIndex, { key: column.key, direction });
		this.requestUpdate();
	}

	#sortedRows(table: MoveTableData, tableIndex: number): MoveRow[] {
		const sort = this.#sorts.get(tableIndex);
		if (!sort) return table.rows;
		const column = COLUMNS.find((entry) => entry.key === sort.key);
		if (!column) return table.rows;
		return [...table.rows].sort((a, b) => {
			const aValue = a[sort.key];
			const bValue = b[sort.key];
			const aMissing = aValue === null || aValue === undefined || aValue === '';
			const bMissing = bValue === null || bValue === undefined || bValue === '';
			// Missing values sort last in both directions.
			if (aMissing || bMissing) {
				if (aMissing && bMissing) return 0;
				return aMissing ? 1 : -1;
			}
			const compared = column.numeric
				? Number(aValue) - Number(bValue)
				: String(aValue).localeCompare(String(bValue));
			return sort.direction === 'ascending' ? compared : -compared;
		});
	}

	#renderTable(table: MoveTableData, tableIndex: number) {
		const columns = COLUMNS.filter((column) => table.hasLevel || column.key !== 'level');
		const sort = this.#sorts.get(tableIndex);
		return html`
			<div class="table-wrap">
				<table class="move-table">
				<caption>${table.name}</caption>
				<thead>
					<tr>
						${columns.map(
							(column) => html`
								<th
									scope="col"
									aria-sort=${sort?.key === column.key ? sort.direction : nothing}
								>
									<button @click=${() => this.#toggleSort(tableIndex, column)}>
										${column.label}
									</button>
								</th>
							`,
						)}
					</tr>
				</thead>
				<tbody>
					${this.#sortedRows(table, tableIndex).map(
						(row) => html`
							<tr>
								${table.hasLevel
									? html`<td>${row.level ?? EM_DASH}</td>`
									: nothing}
								<td><a href="/moves/${row.moveName}">${row.moveLabel}</a></td>
								<td>
									${row.typeName
										? html`<a
												class="type-badge type-${row.typeName}"
												href="/types/${row.typeName}"
												>${row.typeLabel}</a
											>`
										: EM_DASH}
								</td>
								<td>${row.category || EM_DASH}</td>
								<td>${row.power ?? EM_DASH}</td>
								<td>${row.accuracy ?? EM_DASH}</td>
								<td>${row.pp ?? EM_DASH}</td>
							</tr>
						`,
					)}
				</tbody>
				</table>
			</div>
		`;
	}

	override render() {
		return html`
			<div class="game-picker">
				<label for="move-game">Game</label>
				<select id="move-game" @change=${this.#onGameChange}>
					${this.groups.map(
						(group) => html`
							<option value=${group.name} ?selected=${group.name === this.selected}>
								${group.label}
							</option>
						`,
					)}
				</select>
			</div>
			${this.tables.map((table, index) => this.#renderTable(table, index))}
		`;
	}
}

customElements.define('move-explorer', MoveExplorer);
