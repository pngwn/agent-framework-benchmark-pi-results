import { LitElement, html, nothing } from 'lit';
import { isServer } from 'lit';

import { dexNumber, humanize } from '../lib/format.js';
import { islandStyles } from './island-styles.js';

interface SpeciesEntry {
	id: number;
	name: string;
	types: string[];
	gen: string;
}

interface NamedOption {
	name: string;
	label: string;
}

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Interactive Pokémon browser: search, type and generation filters,
 * pagination. Filter state is kept in the URL query string.
 *
 * Rendered on the server (with data passed as attributes) and hydrated on
 * the client, where filtering happens without a page reload.
 */
export class DexBrowser extends LitElement {
	static override properties = {
		apiBase: { type: String, attribute: 'api-base' },
		species: { type: Array },
		types: { type: Array },
		generations: { type: Array },
		q: { type: String },
		type: { type: String },
		generation: { type: String },
		page: { type: Number },
	};

	static override styles = islandStyles;

	apiBase = '';
	species: SpeciesEntry[] = [];
	types: NamedOption[] = [];
	generations: NamedOption[] = [];
	q = '';
	type = '';
	generation = '';
	page = 1;

	#searchTimer: ReturnType<typeof setTimeout> | undefined;

	override connectedCallback() {
		super.connectedCallback();
		if (!isServer) window.addEventListener('popstate', this.#popStateHandler);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		if (!isServer) window.removeEventListener('popstate', this.#popStateHandler);
	}

	#popStateHandler = () => {
		const params = new URLSearchParams(window.location.search);
		this.q = params.get('q') ?? '';
		this.type = params.get('type') ?? '';
		this.generation = params.get('generation') ?? '';
		this.page = Math.max(1, Number(params.get('page')) || 1);
	};

	#href(page: number): string {
		const params = new URLSearchParams();
		if (this.q) params.set('q', this.q);
		if (this.type) params.set('type', this.type);
		if (this.generation) params.set('generation', this.generation);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return query ? `/?${query}` : '/';
	}

	#syncUrl(page: number) {
		if (isServer) return;
		window.history.pushState(null, '', this.#href(page));
	}

	#onSearch(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		clearTimeout(this.#searchTimer);
		this.#searchTimer = setTimeout(() => {
			this.q = value;
			this.page = 1;
			this.#syncUrl(1);
		}, SEARCH_DEBOUNCE_MS);
	}

	#onTypeChange(event: Event) {
		this.type = (event.target as HTMLSelectElement).value;
		this.page = 1;
		this.#syncUrl(1);
	}

	#onGenerationChange(event: Event) {
		this.generation = (event.target as HTMLSelectElement).value;
		this.page = 1;
		this.#syncUrl(1);
	}

	#filtered(): SpeciesEntry[] {
		const query = this.q.trim().toLowerCase();
		return this.species.filter(
			(entry) =>
				(!query || humanize(entry.name).toLowerCase().includes(query)) &&
				(!this.type || entry.types.includes(this.type)) &&
				(!this.generation || entry.gen === this.generation),
		);
	}

	#card(entry: SpeciesEntry) {
		return html`
			<li class="card">
				<a class="card-link" href="/pokemon/${entry.name}">
					<img
						class="card-sprite"
						src="${this.apiBase}/media/sprites/pokemon/${entry.id}.png"
						alt=""
						width="96"
						height="96"
					/>
					<span class="card-dex">${dexNumber(entry.id)}</span>
					<span class="card-name">${humanize(entry.name)}</span>
					<span class="card-types">
						${entry.types.map(
							(type) =>
								html`<span class="type-badge type-${type}"
									>${humanize(type)}</span
								>`,
						)}
					</span>
				</a>
			</li>
		`;
	}

	override render() {
		const filtered = this.#filtered();
		const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
		const page = Math.min(Math.max(1, this.page || 1), totalPages);
		const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

		return html`
			<div class="controls">
				<div class="field field-search">
					<label for="dex-search">Search</label>
					<input
						id="dex-search"
						type="search"
						.value=${this.q}
						@input=${this.#onSearch}
					/>
				</div>
				<div class="field">
					<label for="dex-type">Type</label>
					<select id="dex-type" @change=${this.#onTypeChange}>
						<option value="" ?selected=${!this.type}>All types</option>
						${this.types.map(
							(type) => html`
								<option value=${type.name} ?selected=${this.type === type.name}>
									${type.label}
								</option>
							`,
						)}
					</select>
				</div>
				<div class="field">
					<label for="dex-generation">Generation</label>
					<select id="dex-generation" @change=${this.#onGenerationChange}>
						<option value="" ?selected=${!this.generation}>
							All generations
						</option>
						${this.generations.map(
							(generation) => html`
								<option
									value=${generation.name}
									?selected=${this.generation === generation.name}
								>
									${generation.label}
								</option>
							`,
						)}
					</select>
				</div>
			</div>

			<p class="count">${filtered.length} Pokémon</p>

			${filtered.length === 0
				? html`<p class="empty">No Pokémon found</p>`
				: html`
						<ul class="card-grid">
							${items.map((entry) => this.#card(entry))}
						</ul>
						<div class="pagination">
							<span>Page ${page} of ${totalPages}</span>
							${page > 1
								? html`<a href=${this.#href(page - 1)}>Previous page</a>`
								: nothing}
							${page < totalPages
								? html`<a href=${this.#href(page + 1)}>Next page</a>`
								: nothing}
						</div>
					`}
		`;
	}
}

customElements.define('dex-browser', DexBrowser);
