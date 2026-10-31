import { css } from 'lit';

/**
 * Styles for shadow-DOM islands. Mirrors the relevant parts of the global
 * stylesheet (shadow roots don't inherit document styles, aside from
 * custom properties).
 */
export const islandStyles = css`
	:host {
		display: block;
		font-family: var(--font-sans);
		color: var(--color-text);
	}

	a {
		color: var(--color-link);
	}

	/* ── Cards ── */

	.card-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--card-min-width), 1fr));
		gap: var(--space-4);
	}

	.card-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		height: 100%;
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		text-decoration: none;
		text-align: center;
		box-sizing: border-box;
	}

	.card-sprite {
		width: var(--sprite-size);
		height: var(--sprite-size);
		object-fit: contain;
	}

	.card-dex {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.card-name {
		font-weight: var(--weight-semibold);
	}

	.card-types {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		justify-content: center;
	}

	/* ── Type badges ── */

	.type-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-pill);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		color: var(--color-on-type);
		text-decoration: none;
		line-height: var(--leading-normal);
	}

	.type-normal { background: var(--type-normal); }
	.type-fighting { background: var(--type-fighting); }
	.type-flying { background: var(--type-flying); }
	.type-poison { background: var(--type-poison); }
	.type-ground { background: var(--type-ground); }
	.type-rock { background: var(--type-rock); }
	.type-bug { background: var(--type-bug); }
	.type-ghost { background: var(--type-ghost); }
	.type-steel { background: var(--type-steel); }
	.type-fire { background: var(--type-fire); }
	.type-water { background: var(--type-water); }
	.type-grass { background: var(--type-grass); }
	.type-electric { background: var(--type-electric); }
	.type-psychic { background: var(--type-psychic); }
	.type-ice { background: var(--type-ice); }
	.type-dragon { background: var(--type-dragon); }
	.type-dark { background: var(--type-dark); }
	.type-fairy { background: var(--type-fairy); }

	/* ── Controls ── */

	.controls {
		display: flex;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
		flex-wrap: wrap;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.field-search {
		flex: 1;
		min-width: 12rem;
	}

	.field label {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.field input,
	.field select {
		font: inherit;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
	}

	.field select {
		min-width: 12rem;
	}

	@media (max-width: 48rem) {
		.field {
			width: 100%;
		}
	}

	/* ── Count / pagination ── */

	.count {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		margin: 0 0 var(--space-4);
	}

	.empty {
		color: var(--color-text-muted);
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-4);
		margin-top: var(--space-6);
	}

	/* ── Move tables ── */

	.game-picker {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.game-picker label {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.game-picker select {
		font: inherit;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
	}

	.table-wrap {
		overflow-x: auto;
		margin-bottom: var(--space-6);
	}

	.move-table {
		width: 100%;
		min-width: 34rem;
		border-collapse: collapse;
	}

	.move-table caption {
		text-align: left;
		font-weight: var(--weight-semibold);
		margin-bottom: var(--space-2);
	}

	.move-table th {
		text-align: left;
		font-size: var(--text-sm);
		font-weight: var(--weight-normal);
		color: var(--color-text-muted);
		padding: var(--space-2) var(--space-3);
	}

	.move-table th button {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.move-table td {
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-border);
	}
`;
