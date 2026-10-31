import { html, nothing, type TemplateResult } from 'lit';

import { dexNumber, humanize } from './format.js';

export type CardData = {
	/** Species API name (used for the link). */
	speciesName: string;
	/** Species id (dex number). */
	speciesId: number;
	/** Absolute URL of the front sprite, or null. */
	sprite: string | null;
	/** Type API names in slot order (home page only). */
	types?: string[];
	/** "Hidden ability" marker (ability page only). */
	hiddenAbility?: boolean;
};

/** A type badge, optionally as a link to the type page. */
export function typeBadge(typeName: string, link = false): TemplateResult {
	const label = humanize(typeName);
	if (link)
		return html`<a class="type-badge type-${typeName}" href="/types/${typeName}"
			>${label}</a
		>`;
	return html`<span class="type-badge type-${typeName}">${label}</span>`;
}

/** A Pokémon card: a link to the species page with sprite, dex number and name. */
export function pokemonCard(card: CardData): TemplateResult {
	return html`<li class="card">
		<a href="/pokemon/${card.speciesName}">
			${card.sprite
				? html`<img
						src="${card.sprite}"
						alt=""
						width="96"
						height="96"
						class="card-sprite"
					/>`
				: html`<span class="card-sprite sprite-missing" aria-hidden="true"></span>`}
			<span class="card-dex">${dexNumber(card.speciesId)}</span>
			<span class="card-name">${humanize(card.speciesName)}</span>
			${card.types
				? html`<span class="card-types"
						>${card.types.map((t) => typeBadge(t))}</span
					>`
				: nothing}
			${card.hiddenAbility
				? html`<span class="hidden-ability">Hidden ability</span>`
				: nothing}
		</a>
	</li>`;
}

/** A list of Pokémon cards. */
export function cardList(cards: CardData[]): TemplateResult {
	return html`<ul class="cards">
		${cards.map((card) => pokemonCard(card))}
	</ul>`;
}

/**
 * A section: element with the region role whose accessible name is its heading.
 */
export function section(
	id: string,
	heading: string,
	content: unknown,
	elementId?: string,
): TemplateResult {
	return html`<section aria-labelledby="${id}-heading" id=${elementId ?? nothing}>
		<h2 id="${id}-heading">${heading}</h2>
		${content}
	</section>`;
}

/** Shared not-found page body. */
export function notFoundTemplate(): TemplateResult {
	return html`<main class="container">
		<h1>Not found</h1>
		<p><a href="/">Back to the Pokédex</a></p>
	</main>`;
}
