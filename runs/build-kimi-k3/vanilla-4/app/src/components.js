// Shared HTML building blocks.

import { mediaUrl } from './api.js';
import { dexNumber, esc } from './util.js';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Ccircle cx='48' cy='48' r='30' fill='none' stroke='%23dde1e8' stroke-width='6'/%3E%3Cpath d='M18 48h60' stroke='%23dde1e8' stroke-width='6'/%3E%3Ccircle cx='48' cy='48' r='9' fill='%23dde1e8'/%3E%3C/svg%3E";

export function badgeHtml(typeName, label, { link = false } = {}) {
  const text = esc(label);
  if (link) return `<a class="badge type-${esc(typeName)}" href="/types/${esc(typeName)}">${text}</a>`;
  return `<span class="badge type-${esc(typeName)}">${text}</span>`;
}

// A Pokémon card: a link to the species page with sprite, dex number and name.
// `types` (slot order, as {name, en}) and `extra` text are optional additions.
export function pokemonCardHtml({ id, speciesName, label, types = null, extra = null }) {
  const sprite = mediaUrl(`sprites/pokemon/${id}.png`);
  return `<li class="card"><a class="card-link" href="/pokemon/${esc(speciesName)}">
    <img class="sprite" src="${sprite}" alt="${esc(label)}" width="96" height="96" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" />
    <span class="dex">${dexNumber(id)}</span>
    <span class="card-name">${esc(label)}</span>
    ${types?.length ? `<span class="badges">${types.map((t) => badgeHtml(t.name, t.en)).join('')}</span>` : ''}
    ${extra ? `<span class="card-extra">${esc(extra)}</span>` : ''}
  </a></li>`;
}

export function cardListHtml(cards) {
  return `<ul class="card-grid">${cards.join('')}</ul>`;
}

// A labelled section (region role via aria-labelledby).
export function sectionHtml(id, label, innerHtml) {
  const headingId = `${id}-heading`;
  return `<section class="panel" ${id ? `id="${esc(id)}"` : ''} aria-labelledby="${headingId}">
    <h2 id="${headingId}">${esc(label)}</h2>
    ${innerHtml}
  </section>`;
}
