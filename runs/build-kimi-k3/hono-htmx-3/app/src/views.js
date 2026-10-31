import { html } from 'hono/html';
import { apiOrigin } from './api.js';
import { dexNo, humanize } from './util.js';

export function layout(title, content) {
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/tokens.css">
<link rel="stylesheet" href="/styles.css">
<script src="/vendor/htmx.min.js" defer></script>
<script src="/app.js" defer></script>
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">Pokédex</a>
    <nav class="site-nav" aria-label="Main">
      <a href="/">Pokémon</a>
      <a href="/types">Types</a>
    </nav>
  </div>
</header>
<main class="wrap">
${content}
</main>
<footer class="site-footer">
  <div class="wrap">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</div>
</footer>
</body>
</html>`;
}

export const titleFor = (h1) => (h1 === 'Pokédex' ? 'Pokédex' : `${h1} – Pokédex`);

export const typeBadge = (type, label) =>
  html`<a class="badge type-${type}" href="/types/${type}">${label ?? humanize(type)}</a>`;

// Non-link badge, for use inside Pokémon cards (which are links themselves).
export const typeBadgeSpan = (type, label) =>
  html`<span class="badge type-${type}">${label ?? humanize(type)}</span>`;

// A Pokémon card: link to the species page with front sprite, dex number and
// humanized species name. `opts.types` adds type badges (home page),
// `opts.note` adds extra text such as "Hidden ability" (ability page).
export function card(species, opts = {}) {
  const { id, name } = species;
  return html`<li class="card">
  <a href="/pokemon/${name}">
    <img src="${apiOrigin}/media/sprites/pokemon/${id}.png" alt="" width="96" height="96" loading="lazy">
    <span class="dex">${dexNo(id)}</span>
    <span class="card-name">${humanize(name)}</span>
    ${opts.types?.length ? html`<span class="badges">${opts.types.map((t) => typeBadgeSpan(t.type, opts.typeDisplay?.get(t.type)))}</span>` : ''}
    ${opts.note ? html`<span class="card-note">${opts.note}</span>` : ''}
  </a>
</li>`;
}

export const cardGrid = (cards) => html`<ul class="card-grid">${cards}</ul>`;

export const notFoundContent = html`<h1>Not found</h1>
<p><a href="/">Back to the Pokédex</a></p>`;
