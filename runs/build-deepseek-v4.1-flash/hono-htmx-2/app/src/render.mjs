import { formatDex, humanize, spriteUrl } from './api.mjs';

export const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const pageTitle = (heading) => (heading === 'Pokémon' ? 'Pokédex' : `${heading} – Pokédex`);

export function layout({ title, content }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/tokens.css">
  <link rel="stylesheet" href="/styles.css">
  <script src="/htmx.min.js" defer></script>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">Pokédex</a>
      <nav class="site-nav" aria-label="Primary">
        <a href="/">Pokémon</a>
        <a href="/types">Types</a>
      </nav>
    </div>
  </header>
  <main id="main" class="container main">${content}</main>
  <footer class="site-footer">
    <div class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</div>
  </footer>
</body>
</html>`;
}

export function notFoundPage() {
  return `<h1 class="page-title">Not found</h1>
<p class="not-found-link"><a href="/">Back to the Pokédex</a></p>`;
}

export function typeBadge(name, { link = false, label } = {}) {
  const text = escapeHtml(label ?? humanize(name));
  const className = `type-badge type-${escapeHtml(name)}`;
  if (link) return `<a class="${className}" href="/types/${encodeURIComponent(name)}">${text}</a>`;
  return `<span class="${className}">${text}</span>`;
}

export function typeBadges(typeNames, { links = false, typeCatalog } = {}) {
  return (typeNames ?? [])
    .map((name) =>
      typeBadge(name, {
        link: links,
        label: typeCatalog?.byName?.get(name)?.display ?? humanize(name),
      }),
    )
    .join('');
}

export function pokemonCard({ id, name, types = null, hidden = false, typeCatalog = null }) {
  const display = humanize(name);
  return `<li class="pokemon-card">
  <a class="pokemon-card-link" href="/pokemon/${encodeURIComponent(name)}">
    <img class="pokemon-sprite" src="${escapeHtml(spriteUrl(id))}" alt="" width="96" height="96" loading="lazy">
    <span class="pokemon-dex">${formatDex(id)}</span>
    <span class="pokemon-name">${escapeHtml(display)}</span>
  </a>
  ${types?.length ? `<div class="card-types">${typeBadges(types, { typeCatalog })}</div>` : ''}
  ${hidden ? '<p class="hidden-ability">Hidden ability</p>' : ''}
</li>`;
}

export function cardGrid(cards, options = {}) {
  const items = (cards ?? [])
    .map((card) => pokemonCard({ ...card, typeCatalog: options.typeCatalog }))
    .join('');
  return `<ul class="card-grid">${items}</ul>`;
}

export function section({ id, title, body, sectionId }) {
  const headingId = `${id}-heading`;
  const attributes = sectionId ? ` id="${escapeHtml(sectionId)}"` : '';
  return `<section class="panel"${attributes} aria-labelledby="${escapeHtml(headingId)}">
  <h2 id="${escapeHtml(headingId)}">${escapeHtml(title)}</h2>
  ${body}
</section>`;
}

export function homeUrl({ q = '', type = '', generation = '', page = 1 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page && page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `/?${search}` : '/';
}

export function renderHomeResults({ items, count, page, totalPages, query, typeCatalog }) {
  const pagination =
    count > 0
      ? `<div class="pagination">
  ${page > 1 ? `<a href="${escapeHtml(homeUrl({ ...query, page: page - 1 }))}" rel="prev">Previous page</a>` : ''}
  <span class="page-status">Page ${page} of ${totalPages}</span>
  ${page < totalPages ? `<a href="${escapeHtml(homeUrl({ ...query, page: page + 1 }))}" rel="next">Next page</a>` : ''}
</div>`
      : '';

  return `<div id="pokemon-results">
  <p class="result-count">${count} Pokémon</p>
  ${items.length ? cardGrid(items, { typeCatalog }) : '<p class="empty-state">No Pokémon found</p>'}
  ${pagination}
</div>`;
}
