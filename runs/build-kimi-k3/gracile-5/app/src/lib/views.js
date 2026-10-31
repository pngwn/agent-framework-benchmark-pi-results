// Shared Lit templates used by the route templates (rendered server-side).

import { html } from 'lit';
import { humanize, dexNumber } from './shared.js';
import { spriteUrl } from './api.js';

/** Inline type badge (used inside links/cards where nesting links is invalid). */
export function typeBadge(typeName, english) {
  return html`<span class="badge type-${typeName}">${english ?? humanize(typeName)}</span>`;
}

/** Type badge that links to the type page. */
export function typeBadgeLink(typeName, english) {
  return html`<a class="badge type-${typeName}" href="/types/${typeName}">${english ?? humanize(typeName)}</a>`;
}

/**
 * A Pokémon card: link to the species page with the front sprite, dex
 * number and humanized species name (plus optional type badges / notes).
 */
export function pokemonCard({ id, speciesName, types, hiddenAbility }, typeEn = {}) {
  return html`<li class="card">
    <a href="/pokemon/${speciesName}">
      <img src="${spriteUrl(id)}" alt="" width="96" height="96" loading="lazy" />
      <span class="dex">${dexNumber(id)}</span>
      <span class="name">${humanize(speciesName)}</span>
      ${types?.length
        ? html`<span class="badges">${types.map((type) => typeBadge(type, typeEn[type]))}</span>`
        : ''}
      ${hiddenAbility ? html`<span class="hidden-ability">Hidden ability</span>` : ''}
    </a>
  </li>`;
}

/** A section: an element with the `region` role named by its heading. */
export function section(headingId, heading, content, extraClass = '') {
  return html`<section class="section ${extraClass}" aria-labelledby="${headingId}">
    <h2 id="${headingId}">${heading}</h2>
    ${content}
  </section>`;
}

export function notFoundTemplate() {
  return html`<h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>`;
}

export const NOT_FOUND_TITLE = 'Not found – Pokédex';
