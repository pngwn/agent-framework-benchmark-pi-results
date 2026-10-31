import { html, raw } from 'hono/html';
import { dexNumber, humanize } from '../api.js';

// A small colored pill showing a type's English name.
export function typeBadge(typeName, englishName) {
  return html`<span class="badge type-${typeName}">${englishName}</span>`;
}

export function typeBadgeLink(typeName, englishName) {
  return html`<a class="badge type-${typeName}" href="/types/${typeName}">${englishName}</a>`;
}

// A Pokémon card: link to the species page with front sprite, dex number and
// humanized species name. `options.types` adds type badges (home page),
// `options.hidden` adds the "Hidden ability" note (ability page).
export function pokemonCard(pokemon, options = {}) {
  const { speciesName, speciesId, sprite } = pokemon;
  return html`<li class="card">
    <a href="/pokemon/${speciesName}">
      ${sprite ? html`<img src="${sprite}" alt="" width="96" height="96" loading="lazy" />` : ''}
      <span class="dex">${dexNumber(speciesId)}</span>
      <span class="name">${humanize(speciesName)}</span>
      ${options.types?.length
        ? html`<span class="types">${options.types.map((t) => typeBadge(t.name, t.englishName))}</span>`
        : ''}
      ${options.hidden ? html`<span class="hidden-note">Hidden ability</span>` : ''}
    </a>
  </li>`;
}

export function pokemonCardList(pokemonList, optionsFor = () => ({})) {
  return html`<ul class="cards">
    ${pokemonList.map((p) => pokemonCard(p, optionsFor(p)))}
  </ul>`;
}

// A white surface section with a heading and the region role (implicit via
// aria-labelledby on <section>).
export function section(id, headingText, content, attrs = {}) {
  const extra = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');
  return html`<section class="panel" aria-labelledby="${id}-heading"${raw(extra)}>
    <h2 id="${id}-heading">${headingText}</h2>
    ${content}
  </section>`;
}
