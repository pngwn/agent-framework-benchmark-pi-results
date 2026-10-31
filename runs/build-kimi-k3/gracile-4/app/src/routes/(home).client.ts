/**
 * Home page interactivity: live search, type/generation filters.
 * Filtering happens client-side (no navigation, keeps input focus) and is
 * mirrored into the URL query; pagination stays plain server-rendered links.
 */

import { html, render } from 'lit';

import {
	browseQuery,
	dexNumber,
	filterSpecies,
	paginate,
	type SpeciesLike,
} from '../lib/util.js';

interface TypeInfo {
	name: string;
	en: string;
}

interface BrowsePayload {
	types: TypeInfo[];
	species: SpeciesLike[];
}

const dataElement = document.getElementById('browse-data');

if (dataElement?.textContent) {
	const payload = JSON.parse(
		decodeURIComponent(dataElement.textContent),
	) as BrowsePayload;
	const typeByName = new Map(payload.types.map((t) => [t.name, t]));

	const search = document.getElementById('search') as HTMLInputElement | null;
	const typeSelect = document.getElementById(
		'type-filter',
	) as HTMLSelectElement | null;
	const generationSelect = document.getElementById(
		'generation-filter',
	) as HTMLSelectElement | null;
	// Lit's render() appends its part to non-empty containers; clear the
	// server-rendered content once so the regions become clean mount points.
	const mount = (selector: string): Element | null => {
		const region = document.querySelector(selector);
		region?.replaceChildren();
		return region;
	};
	const countRegion = mount('[data-browse-count]');
	const listRegion = mount('[data-browse-list]');
	const paginationRegion = mount('[data-browse-pagination]');

	const typeBadge = (name: string) => {
		const type = typeByName.get(name);
		return html`<span class="type-badge type-${name}"
			>${type?.en ?? name}</span
		>`;
	};

	const cardListTemplate = (items: SpeciesLike[]) =>
		items.length === 0
			? html`<p class="empty">No Pokémon found</p>`
			: html`<ul class="card-grid">
					${items.map(
						(entry) => html`<li class="card">
							<a href="/pokemon/${entry.name}">
								<img
									src=${entry.sprite}
									alt=""
									width="96"
									height="96"
									loading="lazy"
								/>
								<span class="card-dex">${dexNumber(entry.id)}</span>
								<span class="card-name">${entry.human}</span>
								<span class="card-types"
									>${entry.types.map((name) => typeBadge(name))}</span
								>
							</a>
						</li>`,
					)}
				</ul>`;

	const paginationTemplate = (
		filters: { q: string; type: string; generation: string },
		page: number,
		pageCount: number,
	) => {
		const hrefFor = (target: number) =>
			`/${browseQuery({ ...filters, page: target })}`;
		return html`<p class="pagination">
			<span class="page-status">Page ${page} of ${pageCount}</span>
			${page > 1
				? html`<a class="page-prev" href=${hrefFor(page - 1)}
						>Previous page</a
					>`
				: null}
			${page < pageCount
				? html`<a class="page-next" href=${hrefFor(page + 1)}>Next page</a>`
				: null}
		</p>`;
	};

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const renderAll = (pushUrl: boolean, page: number) => {
		if (!search || !typeSelect || !generationSelect) return;
		const filters = {
			q: search.value.trim(),
			type: typeSelect.value,
			generation: generationSelect.value,
		};
		const matching = filterSpecies(payload.species, filters);
		const pageInfo = paginate(matching, page);

		if (countRegion)
			render(html`${matching.length} Pokémon`, countRegion as Element);
		if (listRegion)
			render(cardListTemplate(pageInfo.items), listRegion as Element);
		if (paginationRegion)
			render(
				paginationTemplate(filters, pageInfo.page, pageInfo.pageCount),
				paginationRegion as Element,
			);

		if (pushUrl)
			history.pushState(
				null,
				'',
				`/${browseQuery({ ...filters, page: pageInfo.page })}`,
			);
	};

	// Any filter change resets to the first page.
	const update = () => renderAll(true, 1);

	// Populate the freshly cleared mount points. Control values are read
	// as-is: they may already differ from the URL if the user interacted
	// before this script loaded. In that case, treat it as a filter change.
	const urlParams = new URLSearchParams(window.location.search);
	const urlPage = Number(urlParams.get('page')) || 1;
	const inSync =
		(search?.value.trim() ?? '') === (urlParams.get('q') ?? '').trim() &&
		(typeSelect?.value ?? '') === (urlParams.get('type') ?? '') &&
		(generationSelect?.value ?? '') === (urlParams.get('generation') ?? '');
	if (inSync) renderAll(false, urlPage);
	else update();

	search?.addEventListener('input', () => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(update, 250);
	});
	typeSelect?.addEventListener('change', update);
	generationSelect?.addEventListener('change', update);
}
