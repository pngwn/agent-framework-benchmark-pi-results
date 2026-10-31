import { html } from 'hono/html';
import { API_BASE } from '../api.js';
import { humanize, dexNumber } from '../format.js';

// A type badge. Set `link` to make it a link to the type page.
export const typeBadge = ({ name, label }, link = false) =>
  link
    ? html`<a class="badge type-${name}" href="/types/${name}">${label}</a>`
    : html`<span class="badge type-${name}">${label}</span>`;

// A Pokémon card: a link to the species page with sprite, dex number and
// humanized species name. Optionally shows type badges (home page) or a
// "Hidden ability" note (ability page).
export const pokemonCard = ({ id, name, types = null, hidden = false, typeLabels = {} }) => html`
  <li class="card" role="listitem">
    <a class="card-link" href="/pokemon/${name}">
      <img src="${API_BASE}/media/sprites/pokemon/${id}.png" alt="" width="96" height="96" loading="lazy">
      <span class="dex">${dexNumber(id)}</span>
      <span class="name">${humanize(name)}</span>
    </a>
    ${types?.length ? html`<span class="badges">${types.map((t) => typeBadge({ name: t.name, label: typeLabels[t.name] ?? humanize(t.name) }))}</span>` : ''}
    ${hidden ? html`<span class="hidden-note">Hidden ability</span>` : ''}
  </li>`;

export const cardList = (cards) => html`<ul class="cards" role="list">${cards}</ul>`;

// A section = an element with the region role whose accessible name is its heading.
export const section = (slug, title, content, id = null) =>
  html`<section${id ? html` id="${id}"` : ''} aria-labelledby="${slug}-heading">
    <h2 id="${slug}-heading">${title}</h2>
    ${content}
  </section>`;

export const notFoundPage = () => html`
  <h1>Not found</h1>
  <p><a href="/">Back to the Pokédex</a></p>`;
