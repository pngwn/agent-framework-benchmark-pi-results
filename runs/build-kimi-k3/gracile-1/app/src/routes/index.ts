import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../document.js';
import { api, idFromUrl } from '../lib/api.js';
import { cardList, type CardData } from '../lib/components.js';
import {
	EXCLUDED_TYPES,
	englishName,
	humanize,
	pageTitle,
} from '../lib/format.js';

const PER_PAGE = 48;

type SpeciesEntry = { name: string; id: number };

function pageUrl(
	page: number,
	filters: { q: string; type: string; generation: string },
): string {
	const params = new URLSearchParams();
	if (filters.q) params.set('q', filters.q);
	if (filters.type) params.set('type', filters.type);
	if (filters.generation) params.set('generation', filters.generation);
	if (page > 1) params.set('page', String(page));
	const query = params.toString();
	return query ? `/?${query}` : '/';
}

export default defineRoute({
	handler: {
		GET: async ({ url }) => {
			// Build-time stub render (server mode renders at request time).
			if (url.hostname === 'gracile-static')
				return {
					q: '',
					type: '',
					generation: '',
					page: 1,
					totalPages: 1,
					count: 0,
					cards: [],
					types: [],
					generations: [],
				};

			const q = (url.searchParams.get('q') ?? '').trim();
			const type = url.searchParams.get('type') ?? '';
			const generation = url.searchParams.get('generation') ?? '';
			const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);

			const [speciesIndex, typeIndex, generationIndex] = await Promise.all([
				api('/pokemon-species/?limit=100000'),
				api('/type/?limit=100'),
				api('/generation/?limit=100'),
			]);

			let species: SpeciesEntry[] = speciesIndex.results.map(
				(entry: { name: string; url: string }) => ({
					name: entry.name,
					id: idFromUrl(entry.url),
				}),
			);

			// Type filter: species whose *default* Pokémon has the type in
			// either slot (default Pokémon share the species id; alternate
			// forms have ids above 10000).
			if (type) {
				try {
					const typeData = await api(`/type/${encodeURIComponent(type)}/`);
					const ids = new Set<number>(
						typeData.pokemon
							.map((p: { pokemon: { url: string } }) => idFromUrl(p.pokemon.url))
							.filter((id: number) => id <= 10000),
					);
					species = species.filter((s) => ids.has(s.id));
				} catch {
					species = [];
				}
			}

			// Generation filter: species introduced in that generation.
			if (generation) {
				try {
					const generationData = await api(
						`/generation/${encodeURIComponent(generation)}/`,
					);
					const names = new Set<string>(
						generationData.pokemon_species.map((s: { name: string }) => s.name),
					);
					species = species.filter((s) => names.has(s.name));
				} catch {
					species = [];
				}
			}

			// Search: case-insensitive substring match on the humanized name.
			if (q) {
				const needle = q.toLowerCase();
				species = species.filter((s) =>
					humanize(s.name).toLowerCase().includes(needle),
				);
			}

			species.sort((a, b) => a.id - b.id);

			const count = species.length;
			const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
			const page = Math.min(
				Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
				totalPages,
			);
			const pageSpecies = species.slice((page - 1) * PER_PAGE, page * PER_PAGE);

			// Each card on this page also shows the Pokémon's types.
			const pokemonRecords = await Promise.all(
				pageSpecies.map((s) => api(`/pokemon/${s.id}/`).catch(() => null)),
			);
			const cards: CardData[] = pageSpecies.map((s, index) => {
				const record = pokemonRecords[index];
				return {
					speciesName: s.name,
					speciesId: s.id,
					sprite: record?.sprites?.front_default ?? null,
					types:
						record?.types
							?.slice()
							.sort(
								(a: { slot: number }, b: { slot: number }) => a.slot - b.slot,
							)
							.map((t: { type: { name: string } }) => t.type.name) ?? [],
				};
			});

			// The 18 types (English names) for the select.
			const types = typeIndex.results
				.filter((t: { name: string }) => !EXCLUDED_TYPES.has(t.name))
				.map((t: { name: string }) => ({ name: t.name, label: humanize(t.name) }));

			// Generations (English names) for the select.
			const generationRecords = await Promise.all(
				generationIndex.results.map((g: { name: string; url: string }) =>
					api(g.url).catch(() => null),
				),
			);
			const generations = generationIndex.results.map(
				(g: { name: string }, index: number) => ({
					name: g.name,
					label: generationRecords[index]
						? englishName(generationRecords[index].names, g.name)
						: humanize(g.name),
				}),
			);

			return { q, type, generation, page, totalPages, count, cards, types, generations };
		},
	},

	document: (context) => document({ ...context, title: pageTitle(null) }),

	template: (context) => {
		const { q, type, generation, page, totalPages, count, cards, types, generations } =
			context.props.GET as any;
		const filters = { q, type, generation };

		return html`
			<main class="container">
				<h1>Pokémon</h1>

				<form class="filters" method="get" action="/" id="filters">
					<div class="field">
						<label for="filter-q">Search</label>
						<input type="search" id="filter-q" name="q" value="${q}" />
					</div>
					<div class="field">
						<label for="filter-type">Type</label>
						<select id="filter-type" name="type">
							<option value="" ?selected=${type === ''}>All types</option>
							${types.map(
								(t: { name: string; label: string }) =>
									html`<option value="${t.name}" ?selected=${t.name === type}>
										${t.label}
									</option>`,
							)}
						</select>
					</div>
					<div class="field">
						<label for="filter-generation">Generation</label>
						<select id="filter-generation" name="generation">
							<option value="" ?selected=${generation === ''}>
								All generations
							</option>
							${generations.map(
								(g: { name: string; label: string }) =>
									html`<option value="${g.name}" ?selected=${g.name === generation}>
										${g.label}
									</option>`,
							)}
						</select>
					</div>
				</form>

				<p class="result-count">${count} Pokémon</p>

				${count === 0
					? html`<p class="no-results">No Pokémon found</p>`
					: cardList(cards)}

				<div class="pagination">
					<p>Page ${page} of ${totalPages}</p>
					<p class="pagination-links">
						${page > 1
							? html`<a href="${pageUrl(page - 1, filters)}">Previous page</a>`
							: ''}
						${page < totalPages
							? html`<a href="${pageUrl(page + 1, filters)}">Next page</a>`
							: ''}
					</p>
				</div>
			</main>
		`;
	},
});
