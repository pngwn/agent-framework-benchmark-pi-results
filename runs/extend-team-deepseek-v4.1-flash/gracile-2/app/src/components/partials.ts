import { html } from '@gracile/gracile/server-html';

import { spriteUrl } from '../lib/api.js';
import type { Card, TypeBadge } from '../lib/data.js';
import { dexNumber } from '../lib/format.js';

export const typeBadge = (type: TypeBadge) =>
	html`<span class="type-badge" style=${`--type-color: var(--type-${type.name}, var(--color-text-muted))`}
		>${type.label}</span
	>`;

export const typeLink = (type: TypeBadge) =>
	html`<a
		class="type-badge"
		style=${`--type-color: var(--type-${type.name}, var(--color-text-muted))`}
		href=${`/types/${type.name}`}
		>${type.label}</a
	>`;

const cardLink = (card: Card) => html`
	<a class="card" href=${`/pokemon/${card.name}`}>
		<img
			class="card__sprite"
			src=${spriteUrl(card.id)}
			alt=""
			width="96"
			height="96"
			loading="lazy"
			decoding="async"
		/>
		<span class="card__dex">${dexNumber(card.id)}</span>
		<span class="card__name">${card.label}</span>
		${card.types
			? html`<span class="card__types">${card.types.map(typeBadge)}</span>`
			: null}
		${card.hidden ? html`<span class="card__note">Hidden ability</span>` : null}
	</a>
`;

export const pokemonCard = (card: Card) => html`
	<li>
		${cardLink(card)}
	</li>
`;

export const teamCard = (card: Card) => html`
	<li class="team-card">
		${cardLink(card)}
		<button type="button" class="team-card__remove" data-remove-member=${card.name}>
			Remove ${card.label}
		</button>
	</li>
`;

export const cardList = (cards: Card[]) =>
	html`<ul class="card-grid">
		${cards.map(pokemonCard)}
	</ul>`;

export const section = (id: string, title: string, content: unknown) => html`
	<section class="panel" id=${id} aria-labelledby=${`${id}-heading`}>
		<h2 class="panel__title" id=${`${id}-heading`}>${title}</h2>
		${content}
	</section>
`;

export const count = (n: number, noun = 'Pokémon') =>
	html`<p class="count">${n} ${noun}</p>`;

export const notFound = () => html`
	<h1 class="page-title">Not found</h1>
	<p><a href="/">Back to the Pokédex</a></p>
`;
