import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../document.js';
import {
	getGenerations,
	getPokemonTypesMap,
	getSpeciesList,
	getTypeNames,
	getTypes,
} from '../lib/data.js';
import { cardList, pokemonCard } from '../lib/views.js';
import { englishName, humanize } from '../lib/util.js';

const PER_PAGE = 48;

const option = (value, label, selected) =>
	selected
		? html`<option value="${value}" selected>${label}</option>`
		: html`<option value="${value}">${label}</option>`;

export default defineRoute({
	handler: {
		GET: async ({ url }) => {
			const q = (url.searchParams.get('q') ?? '').trim();
			const typeParam = url.searchParams.get('type') ?? '';
			const generationParam = url.searchParams.get('generation') ?? '';
			const pageParam = Math.max(
				1,
				Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
			);

			const [species, types, typeNames, generations, pokemonTypes] =
				await Promise.all([
					getSpeciesList(),
					getTypes(),
					getTypeNames(),
					getGenerations(),
					getPokemonTypesMap(),
				]);

			const type = types.some((t) => t.name === typeParam) ? typeParam : '';
			const generation = generations.some((g) => g.name === generationParam)
				? generationParam
				: '';
			const generationSpecies = generation
				? new Set(
						generations
							.find((g) => g.name === generation)
							.pokemon_species.map((s) => s.name),
					)
				: null;

			const needle = q.toLowerCase();
			const matching = species.filter((s) => {
				if (needle && !humanize(s.name).toLowerCase().includes(needle))
					return false;
				if (
					type &&
					!(pokemonTypes.get(s.id) ?? []).some((t) => t.type === type)
				)
					return false;
				if (generationSpecies && !generationSpecies.has(s.name)) return false;
				return true;
			});

			const count = matching.length;
			const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
			const page = Math.min(pageParam, totalPages);
			const items = matching
				.slice((page - 1) * PER_PAGE, page * PER_PAGE)
				.map((s) => ({
					...s,
					types: (pokemonTypes.get(s.id) ?? []).map((t) => t.type),
				}));

			return {
				q,
				type,
				generation,
				page,
				totalPages,
				count,
				items,
				types,
				typeNames: Object.fromEntries(typeNames),
				generationOptions: generations.map((g) => ({
					name: g.name,
					label: englishName(g),
				})),
			};
		},
	},

	document: (context) => document({ ...context, title: 'Pokédex' }),

	template: (context) => {
		const p = context.props.GET;
		const typeNames = new Map(Object.entries(p.typeNames));

		const pageUrl = (n) => {
			const params = new URLSearchParams();
			if (p.q) params.set('q', p.q);
			if (p.type) params.set('type', p.type);
			if (p.generation) params.set('generation', p.generation);
			if (n > 1) params.set('page', String(n));
			const query = params.toString();
			return query ? `/?${query}` : '/';
		};

		return html`
			<h1>Pokémon</h1>

			<form id="filters" class="filters" method="get" action="/">
				<div class="field field-search">
					<label for="filter-q">Search</label>
					<input
						type="search"
						id="filter-q"
						name="q"
						value="${p.q}"
						autocomplete="off"
					/>
				</div>
				<div class="field">
					<label for="filter-type">Type</label>
					<select id="filter-type" name="type">
						${option('', 'All types', p.type === '')}
						${p.types.map((t) =>
							option(t.name, typeNames.get(t.name) ?? t.name, p.type === t.name),
						)}
					</select>
				</div>
				<div class="field">
					<label for="filter-generation">Generation</label>
					<select id="filter-generation" name="generation">
						${option('', 'All generations', p.generation === '')}
						${p.generationOptions.map((g) =>
							option(g.name, g.label, p.generation === g.name),
						)}
					</select>
				</div>
			</form>

			<div id="results">
				<p class="count">${p.count} Pokémon</p>
				${p.count === 0
					? html`<p class="empty">No Pokémon found</p>`
					: cardList(
							p.items.map((s) =>
								pokemonCard(
									{ speciesId: s.id, speciesName: s.name },
									typeNames,
									{ types: s.types },
								),
							),
						)}
				<nav class="pagination" aria-label="Pagination">
					<span class="page-status">Page ${p.page} of ${p.totalPages}</span>
					${p.page > 1
						? html`<a href="${pageUrl(p.page - 1)}">Previous page</a>`
						: null}
					${p.page < p.totalPages
						? html`<a href="${pageUrl(p.page + 1)}">Next page</a>`
						: null}
				</nav>
			</div>
		`;
	},
});
