import { dexNumber, humanize } from './api.js';

// Tiny HTML template helper: interpolations are escaped unless wrapped in raw().
class Raw {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}
export const raw = (value) => new Raw(value);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

export function html(strings, ...values) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < values.length) out += stringify(values[i]);
  });
  return new Raw(out);
}

function stringify(value) {
  if (value == null || value === false) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(stringify).join('');
  return esc(value);
}

export const typeBadge = (typeName, english) => html`
  <a class="type-badge" style="background-color: var(--type-${typeName}, var(--color-text-muted))" href="/types/${typeName}">${english}</a>
`;

// Non-link badge, for use inside cards (a card already is a link).
export const typeBadgePlain = (typeName, english) => html`
  <span class="type-badge" style="background-color: var(--type-${typeName}, var(--color-text-muted))">${english}</span>
`;

// A Pokémon card: a link to the species page with the front sprite, dex number
// and humanized species name. Optionally type badges (home) and a hidden-ability note.
export function pokemonCard({ speciesName, id, spriteUrl, types = null, hidden = false }) {
  return html`
    <li class="card">
      <a class="card-link" href="/pokemon/${speciesName}">
        <img src="${spriteUrl}" alt="" width="96" height="96" loading="lazy" />
        <span class="card-dex">${dexNumber(id)}</span>
        <span class="card-name">${humanize(speciesName)}</span>
      </a>
      ${types ? html`<span class="card-types">${types.map((t) => typeBadgePlain(t.name, t.englishName))}</span>` : ''}
      ${hidden ? html`<span class="card-hidden">Hidden ability</span>` : ''}
    </li>
  `;
}

export function cardList(cards) {
  return html`<ul class="card-grid">${cards}</ul>`;
}

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// A section: an element with the region role whose accessible name is its heading.
export function section(heading, content, id = null) {
  const s = id ?? slug(heading);
  return html`
    <section${id ? html` id="${id}"` : ''} aria-labelledby="${s}-heading" class="section">
      <h2 id="${s}-heading">${heading}</h2>
      ${content}
    </section>
  `;
}

// The shared page shell. `content` is the inner HTML of <main> and must contain
// exactly one h1. `docTitle` is the full document title.
export function layout({ docTitle, content }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(docTitle)}</title>
    <link rel="stylesheet" href="/tokens.css" />
    <link rel="stylesheet" href="/app.css" />
    <script src="/htmx.min.js" defer></script>
  </head>
  <body>
    <header class="site-header">
      <div class="site-header-inner">
        <a class="site-title" href="/">Pokédex</a>
        <nav class="site-nav" aria-label="Main">
          <a href="/">Pokémon</a>
          <a href="/types">Types</a>
        </nav>
      </div>
    </header>
    <main class="site-main">
${content}
    </main>
    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  </body>
</html>`;
}

export function pageDocTitle(h1Text) {
  return h1Text ? `${h1Text} – Pokédex` : 'Pokédex';
}

export function notFoundPage() {
  return layout({
    docTitle: pageDocTitle('Not found'),
    content: `
      <h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>`,
  });
}
