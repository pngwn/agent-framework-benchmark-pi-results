// Pure HTML template helpers shared by the server renderer and the browser bundle.
import { humanize, dexNumber, escapeHtml } from './format.js';

export function typeBadge(name, { link = false } = {}) {
  const cls = `type-badge type-${escapeHtml(name)}`;
  const label = escapeHtml(humanize(name));
  return link
    ? `<a class="${cls}" href="/types/${encodeURIComponent(name)}">${label}</a>`
    : `<span class="${cls}">${label}</span>`;
}

// A Pokémon card: link to the species page with sprite, dex number and humanized name.
export function speciesCard(species, { showTypes = false, extra = '' } = {}) {
  const { id, name, sprite, types = [] } = species;
  return (
    `<li class="card">` +
    `<a class="card-link" href="/pokemon/${encodeURIComponent(name)}">` +
    `<img class="card-sprite" src="${escapeHtml(sprite)}" alt="" width="96" height="96">` +
    `<span class="card-dex">${dexNumber(id)}</span>` +
    `<span class="card-name">${escapeHtml(humanize(name))}</span>` +
    (showTypes && types.length
      ? `<span class="card-types">${types.map((t) => typeBadge(t)).join('')}</span>`
      : '') +
    (extra ? `<span class="card-extra">${extra}</span>` : '') +
    `</a></li>`
  );
}

export function section(headingId, heading, inner, { id, className = '' } = {}) {
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  return (
    `<section${idAttr} class="panel ${escapeHtml(className)}" aria-labelledby="${escapeHtml(headingId)}">` +
    `<h2 id="${escapeHtml(headingId)}">${escapeHtml(heading)}</h2>` +
    inner +
    `</section>`
  );
}
