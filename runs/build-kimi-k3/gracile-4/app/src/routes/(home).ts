import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../document.js';
import {
	getGenerations,
	getSpeciesIndex,
	getTypes,
	type GenerationInfo,
	type TypeInfo,
} from '../lib/data.js';
import {
	browseQuery,
	filterSpecies,
	paginate,
} from '../lib/util.js';
import { cardList, type CardData } from '../lib/views.js';

interface HomeProps {
	build?: boolean;
	error?: string;
	q: string;
	type: string;
	generation: string;
	page: number;
	pageCount: number;
	count: number;
	cards: CardData[];
	types: TypeInfo[];
	generations: GenerationInfo[];
	payload: string;
}

function optionTag(
	value: string,
	label: string,
	selectedValue: string,
) {
	return value === selectedValue
		? html`<option value=${value} selected>${label}</option>`
		: html`<option value=${value}>${label}</option>`;
}

function pagination(props: {
	q: string;
	type: string;
	generation: string;
	page: number;
	pageCount: number;
}) {
	const { page, pageCount } = props;
	const hrefFor = (target: number) =>
		`/${browseQuery({ ...props, page: target })}`;
	return html`<p class="pagination">
		<span class="page-status">Page ${page} of ${pageCount}</span>
		${page > 1
			? html`<a class="page-prev" href=${hrefFor(page - 1)}>Previous page</a>`
			: null}
		${page < pageCount
			? html`<a class="page-next" href=${hrefFor(page + 1)}>Next page</a>`
			: null}
	</p>`;
}

export default defineRoute({
	handler: async (context): Promise<HomeProps> => {
		// During `vite build`, routes are pre-rendered only to collect their
		// asset tags; never touch the API there.
		if (context.url.hostname === 'gracile-static')
			return {
				build: true,
				q: '',
				type: '',
				generation: '',
				page: 1,
				pageCount: 1,
				count: 0,
				cards: [],
				types: [],
				generations: [],
				payload: '{}',
			};

		const [species, types, generations] = await Promise.all([
			getSpeciesIndex(),
			getTypes(),
			getGenerations(),
		]);

		const params = context.url.searchParams;
		const q = params.get('q')?.trim() ?? '';
		const rawType = params.get('type') ?? '';
		const type = types.some((t) => t.name === rawType) ? rawType : '';
		const rawGeneration = params.get('generation') ?? '';
		const generation = generations.some((g) => g.name === rawGeneration)
			? rawGeneration
			: '';
		const pageParam = Number(params.get('page')) || 1;

		const matching = filterSpecies(species, { q, type, generation });
		const { page, pageCount, items } = paginate(matching, pageParam);

		const typeByName = new Map(types.map((t) => [t.name, t]));
		const cards: CardData[] = items.map((entry) => ({
			id: entry.id,
			name: entry.name,
			human: entry.human,
			sprite: entry.sprite,
			types: entry.types
				.map((name) => typeByName.get(name))
				.filter((t): t is TypeInfo => Boolean(t)),
		}));

		// Percent-encoded so the payload survives verbatim inside the
		// raw-text <script> element (no HTML-escapable characters).
		const payload = encodeURIComponent(JSON.stringify({ types, species }));

		return {
			q,
			type,
			generation,
			page,
			pageCount,
			count: matching.length,
			cards,
			types,
			generations,
			payload,
		};
	},

	document: (context) => document({ url: context.url, title: null }),

	template: (context) => {
		const props = context.props as HomeProps;
		if (props.build)
			return html`<main class="content"><h1>Pokémon</h1></main>`;

		return html`
			<main class="content">
				<h1>Pokémon</h1>

				<div class="controls">
					<div class="field field-search">
						<label for="search">Search</label>
						<input
							id="search"
							type="search"
							name="q"
							value=${props.q}
							autocomplete="off"
						/>
					</div>
					<div class="field">
						<label for="type-filter">Type</label>
						<select id="type-filter" name="type">
							${optionTag('', 'All types', props.type)}
							${props.types.map((type) => optionTag(type.name, type.en, props.type))}
						</select>
					</div>
					<div class="field">
						<label for="generation-filter">Generation</label>
						<select id="generation-filter" name="generation">
							${optionTag('', 'All generations', props.generation)}
							${props.generations.map((generation) =>
								optionTag(generation.name, generation.en, props.generation),
							)}
						</select>
					</div>
				</div>

				<p class="count" data-browse-count>${props.count} Pokémon</p>

				<div data-browse-list>
					${props.cards.length > 0
						? cardList(props.cards)
						: html`<p class="empty">No Pokémon found</p>`}
				</div>

				<div data-browse-pagination>${pagination(props)}</div>

				<script type="application/json" id="browse-data">${props.payload}</script>
			</main>
		`;
	},
});
