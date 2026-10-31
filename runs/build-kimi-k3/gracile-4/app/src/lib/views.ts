/**
 * Shared server-side template partials (Lit SSR server templates).
 */

import { html, type ServerTemplate } from '@gracile/gracile/server-html';

import type { TypeInfo } from './data.js';
import { dexNumber } from './util.js';

/** A `<section>` region named by its heading. */
export function section(
	id: string,
	heading: string,
	content: unknown,
): ServerTemplate {
	return html`<section id=${id} aria-labelledby="${id}-heading" class="surface">
		<h2 id="${id}-heading">${heading}</h2>
		${content}
	</section>`;
}

/** Colored type pill. Rendered as a link or as plain text. */
export function typeBadge(
	type: { name: string; en: string },
	link = false,
): ServerTemplate {
	if (link) {
		return html`<a class="type-badge type-${type.name}" href="/types/${type.name}"
			>${type.en}</a
		>`;
	}
	return html`<span class="type-badge type-${type.name}">${type.en}</span>`;
}

export interface CardData {
	id: number;
	name: string;
	human: string;
	sprite: string;
	types?: TypeInfo[];
	note?: string;
}

/** A Pokémon card: link to the species page with sprite, dex number and name. */
export function pokemonCard(card: CardData): ServerTemplate {
	return html`<li class="card">
		<a href="/pokemon/${card.name}">
			<img
				src=${card.sprite}
				alt=""
				width="96"
				height="96"
				loading="lazy"
			/>
			<span class="card-dex">${dexNumber(card.id)}</span>
			<span class="card-name">${card.human}</span>
			${card.types
				? html`<span class="card-types"
						>${card.types.map((type) => typeBadge(type))}</span
					>`
				: null}
			${card.note ? html`<span class="card-note">${card.note}</span>` : null}
		</a>
	</li>`;
}

export function cardList(cards: CardData[]): ServerTemplate {
	return html`<ul class="card-grid">
		${cards.map((card) => pokemonCard(card))}
	</ul>`;
}

/** Shared "Not found" `<main>` content. */
export function notFoundMain(): ServerTemplate {
	return html`<main class="content">
		<h1>Not found</h1>
		<p><a href="/">Back to the Pokédex</a></p>
	</main>`;
}
