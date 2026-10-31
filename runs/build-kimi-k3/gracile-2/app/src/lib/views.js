import { html } from '@gracile/gracile/server-html';

import { apiBase } from './api.js';
import { dexNumber, humanize } from './util.js';

export const spriteUrl = (id) =>
	`${apiBase()}/media/sprites/pokemon/${id}.png`;

/**
 * A Pokémon card: link to the species page with sprite, dex number and
 * humanized name. `options.types` adds type badges (home page),
 * `options.note` adds a line of muted text (e.g. "Hidden ability").
 */
export function pokemonCard(
	{ speciesId, speciesName },
	typeNames,
	options = {},
) {
	const { types = null, note = null } = options;
	return html`
		<li class="card">
			<a href="/pokemon/${speciesName}">
				<img
					src="${spriteUrl(speciesId)}"
					alt=""
					width="96"
					height="96"
					loading="lazy"
				/>
				<span class="card-dex">${dexNumber(speciesId)}</span>
				<span class="card-name">${humanize(speciesName)}</span>
				${types
					? html`<span class="badges">
							${types.map(
								(t) =>
									html`<span class="badge type-${t}"
										>${typeNames.get(t) ?? humanize(t)}</span
									>`,
							)}
						</span>`
					: null}
				${note ? html`<span class="card-note">${note}</span>` : null}
			</a>
		</li>
	`;
}

export function cardList(cards) {
	return html`<ul class="cards">
		${cards}
	</ul>`;
}

export const notFoundContent = html`
	<h1>Not found</h1>
	<p><a href="/">Back to the Pokédex</a></p>
`;

export const NOT_FOUND_TITLE = 'Not found – Pokédex';
