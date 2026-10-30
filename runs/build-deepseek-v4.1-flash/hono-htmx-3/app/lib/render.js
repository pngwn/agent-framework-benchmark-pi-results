import { humanize, paddedDex } from './api.js';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderLayout({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/tokens.css">
  <link rel="stylesheet" href="/styles.css">
  <script src="/htmx.min.js" defer></script>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">Pokédex</a>
      <nav class="site-nav" aria-label="Main">
        <a href="/">Pokémon</a>
        <a href="/types">Types</a>
      </nav>
    </div>
  </header>
  <main class="container">
${body}
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </div>
  </footer>
</body>
</html>`;
}

export function typeBadge(name, label, { link = false } = {}) {
  const className = `type-badge type-${esc(name)}`;
  const text = esc(label);
  if (link) {
    return `<a class="${className}" href="/types/${encodeURIComponent(name)}">${text}</a>`;
  }
  return `<span class="${className}">${text}</span>`;
}

export function typeBadges(types, { links = false } = {}) {
  return types
    .map((type) => typeBadge(type.name, type.label, { link: links }))
    .join('');
}

export function pokemonCard(card, { showTypes = false } = {}) {
  const sprite = card.sprite
    ? `<img class="card-sprite" src="${esc(card.sprite)}" alt="" width="96" height="96" loading="lazy">`
    : `<span class="card-sprite card-sprite-empty" aria-hidden="true"></span>`;
  const types =
    showTypes && card.types?.length
      ? `<span class="card-types">${typeBadges(card.types)}</span>`
      : '';
  const hidden = card.isHidden ? `<span class="card-hidden">Hidden ability</span>` : '';
  const label = card.label ?? humanize(card.name);
  return `<li class="pokemon-card">
  <a class="pokemon-card-link" href="/pokemon/${encodeURIComponent(card.name)}">
    <span class="card-sprite-wrap">${sprite}</span>
    <span class="card-dex">${esc(paddedDex(card.id))}</span>
    <span class="card-name">${esc(label)}</span>
    ${types}
    ${hidden}
  </a>
</li>`;
}

export function pokemonCards(cards, options) {
  return `<ul class="pokemon-grid">${cards
    .map((card) => pokemonCard(card, options))
    .join('')}</ul>`;
}

export function section(id, heading, content, extraClass = '') {
  return `<section class="panel ${extraClass}" aria-labelledby="${esc(id)}-heading">
  <h2 id="${esc(id)}-heading">${esc(heading)}</h2>
  ${content}
</section>`;
}
