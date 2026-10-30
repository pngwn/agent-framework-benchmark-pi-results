import { html } from 'hono/html';
import { humanize, typeLabel } from '../api.js';

export function layout({ title, content }) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="/tokens.css">
    <link rel="stylesheet" href="/styles.css">
    <script src="/vendor/htmx.min.js" defer></script>
    <script src="/client.js" defer></script>
  </head>
  <body>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/">Pokédex</a>
        <nav class="site-nav" aria-label="Primary">
          <ul>
            <li><a href="/">Pokémon</a></li>
            <li><a href="/types">Types</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="page">
${content}
    </main>
    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  </body>
</html>`;
}

export function pageTitle(heading) {
  return heading === 'Pokémon' ? 'Pokédex' : `${heading} – Pokédex`;
}

export function panel({ id, title, body }) {
  const headingId = `${id}-heading`;
  return html`<section class="panel" id="${id}" aria-labelledby="${headingId}">
  <h2 id="${headingId}">${title}</h2>
  ${body}
</section>`;
}

export function typeBadge(name, { link = true } = {}) {
  const className = `type-badge type-${name}`;
  const label = typeLabel(name);
  if (!link) return html`<span class="${className}">${label}</span>`;
  return html`<a class="${className}" href="/types/${name}">${label}</a>`;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function pokemonCard({ id, name, sprite, types = null, hidden = false }) {
  return html`<li class="pokemon-card">
  <a class="pokemon-card-link" href="/pokemon/${name}">
    <img class="sprite" src="${sprite}" alt="" width="96" height="96" loading="lazy">
    <span class="dex-number">${dexNumber(id)}</span>
    <span class="card-name">${humanize(name)}</span>
  </a>
  ${types && types.length ? html`<span class="card-types">${types.map((type) => typeBadge(type, { link: false }))}</span>` : ''}
  ${hidden ? html`<span class="card-hidden">Hidden ability</span>` : ''}
</li>`;
}

export function pokemonCardList(cards) {
  return html`<ul class="pokemon-grid">${cards.map((card) => pokemonCard(card))}</ul>`;
}

export function countText(count, noun = 'Pokémon') {
  return html`<p class="count">${count} ${noun}</p>`;
}

export function typeLinks(names) {
  if (!names || names.length === 0) return html`None`;
  return html`${names.map((name) => typeBadge(name))}`;
}

export function textOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}
