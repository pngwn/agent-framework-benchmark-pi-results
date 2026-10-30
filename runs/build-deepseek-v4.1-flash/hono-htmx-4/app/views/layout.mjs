import { html } from 'hono/html';
import { dexNumber, humanize, typeLabel } from '../lib/format.mjs';
import { spriteUrl } from '../lib/api.mjs';

export function renderLayout({ documentTitle, content }) {
  return html`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${documentTitle}</title>
    <link rel="stylesheet" href="/tokens.css">
    <link rel="stylesheet" href="/styles.css">
    <script src="/htmx.min.js" defer></script>
  </head>
  <body>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/">Pokédex</a>
        <nav class="site-nav" aria-label="Main">
          <a href="/">Pokémon</a>
          <a href="/types">Types</a>
        </nav>
      </div>
    </header>
    <main>
      ${content}
    </main>
    <footer class="site-footer">
      Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
    </footer>
  </body>
</html>`;
}

export function notFoundPage() {
  return renderLayout({
    documentTitle: 'Not found – Pokédex',
    content: html`<h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>`,
  });
}

export function typeBadge(name, { small = false } = {}) {
  return html`<span class="type-badge type-${name}${small ? ' type-badge-small' : ''}">${typeLabel(name)}</span>`;
}

export function typeBadgeLink(name, { small = false } = {}) {
  return html`<a class="type-link" href="/types/${name}">${typeBadge(name, { small })}</a>`;
}

export function pokemonCard({ species, types = null, hidden = false }) {
  return html`<li class="pokemon-card">
    <a class="pokemon-card-link" href="/pokemon/${species.name}">
      <img class="pokemon-sprite" src="${spriteUrl(species.id)}" alt="" width="96" height="96" loading="lazy">
      <span class="dex-number">${dexNumber(species.id)}</span>
      <span class="pokemon-card-name">${humanize(species.name)}</span>
      ${types && types.length
        ? html`<span class="card-types">${types.map((type) => typeBadge(type.name, { small: true }))}</span>`
        : ''}
      ${hidden ? html`<span class="hidden-label">Hidden ability</span>` : ''}
    </a>
  </li>`;
}

export function pokemonCardGrid(cards) {
  return html`<ul class="card-grid">${cards}</ul>`;
}

export function countText(count, noun = 'Pokémon') {
  return html`<p class="count-text">${count} ${noun}</p>`;
}

export function section({ id, heading, content, headingId = `${id}-heading` }) {
  return html`<section id="${id}" class="panel" aria-labelledby="${headingId}">
    <h2 id="${headingId}">${heading}</h2>
    ${content}
  </section>`;
}
