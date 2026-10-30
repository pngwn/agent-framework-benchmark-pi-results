import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { cardList, count } from '../components/partials.js';
import { document } from '../document.js';
import { isBuildRender } from '../lib/api.js';
import { getGenerations, getPokemonIndex, getTypes } from '../lib/data.js';

const PAGE_SIZE = 48;

export default defineRoute({
	handler: async ({ url }) => {
		const params = url.searchParams;
		const q = (params.get('q') ?? '').trim();
		const type = params.get('type') ?? '';
		const generation = params.get('generation') ?? '';

		const [index, types, generations] = isBuildRender(url)
			? [[], [], []]
			: await Promise.all([getPokemonIndex(), getTypes(), getGenerations()]);

		const needle = q.toLowerCase();
		const matches = index.filter(
			(p) =>
				(!needle || p.label.toLowerCase().includes(needle)) &&
				(!type || p.types.some((t) => t.name === type)) &&
				(!generation || p.generation === generation),
		);

		const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
		const requested = Number.parseInt(params.get('page') ?? '1', 10);
		const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), pages);

		const pageUrl = (n: number) => {
			const query = new URLSearchParams();
			if (q) query.set('q', q);
			if (type) query.set('type', type);
			if (generation) query.set('generation', generation);
			if (n > 1) query.set('page', String(n));
			const s = query.toString();
			return s ? `/?${s}` : '/';
		};

		return {
			q,
			type,
			generation,
			types,
			generations,
			total: matches.length,
			results: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
			page,
			pages,
			prev: page > 1 ? pageUrl(page - 1) : null,
			next: page < pages ? pageUrl(page + 1) : null,
		};
	},

	document: () => document({ title: null }),

	template: ({ props }) => html`
		<h1 class="page-title">Pokémon</h1>

		<pokemon-browser>
			<form class="filters" method="get" action="/">
				<div class="field field--search">
					<label for="filter-q">Search</label>
					<input
						id="filter-q"
						type="search"
						name="q"
						value=${props.q}
						autocomplete="off"
						spellcheck="false"
					/>
				</div>
				<div class="field">
					<label for="filter-type">Type</label>
					<select id="filter-type" name="type">
						<option value="">All types</option>
						${props.types.map(
							(t) =>
								html`<option value=${t.name} ?selected=${t.name === props.type}>${t.label}</option>`,
						)}
					</select>
				</div>
				<div class="field">
					<label for="filter-generation">Generation</label>
					<select id="filter-generation" name="generation">
						<option value="">All generations</option>
						${props.generations.map(
							(g) =>
								html`<option value=${g.name} ?selected=${g.name === props.generation}>${g.label}</option>`,
						)}
					</select>
				</div>
			</form>

			<div id="results" class="results">
				${count(props.total)}
				${props.total
					? html`
							${cardList(props.results)}
							<nav class="pagination" aria-label="Pagination">
								${props.prev
									? html`<a href=${props.prev} rel="prev">Previous page</a>`
									: null}
								<span>Page ${props.page} of ${props.pages}</span>
								${props.next
									? html`<a href=${props.next} rel="next">Next page</a>`
									: null}
							</nav>
						`
					: html`<p class="empty">No Pokémon found</p>`}
			</div>
		</pokemon-browser>
	`,
});
