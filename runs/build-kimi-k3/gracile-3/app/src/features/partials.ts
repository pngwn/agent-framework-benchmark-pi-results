/** Server-rendered template partials shared by routes. */

import { html } from '@gracile/gracile/server-html';

import { spriteUrl } from '../lib/api.js';
import type { CardEntry } from '../lib/data.js';
import { dexNumber, humanize } from '../lib/format.js';

export function pokemonCard(card: CardEntry) {
	return html`
		<li class="card">
			<a class="card-link" href="/pokemon/${card.name}">
				<img
					class="card-sprite"
					src="${spriteUrl(card.id)}"
					alt=""
					width="96"
					height="96"
				/>
				<span class="card-dex">${dexNumber(card.id)}</span>
				<span class="card-name">${humanize(card.name)}</span>
				${card.hidden ? html`<span class="card-note">Hidden ability</span>` : ''}
			</a>
		</li>
	`;
}

export function pokemonCardList(cards: CardEntry[]) {
	return html`<ul class="card-grid">
		${cards.map(pokemonCard)}
	</ul>`;
}

export function typeBadgeLink(name: string, label: string) {
	return html`<a class="type-badge type-${name}" href="/types/${name}">${label}</a>`;
}

export const notFoundTemplate = html`
	<h1>Not found</h1>
	<p><a href="/">Back to the Pokédex</a></p>
`;
