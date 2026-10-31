import { escapeHtml } from './shared/format.js';

// The shared page shell: banner with brand link, navigation, one main landmark,
// contentinfo footer.
export function layout({ title, h1, body, assets, headExtra = '', bodyAttributes = '' }) {
  const fullTitle = h1 === 'Pokédex' ? 'Pokédex' : `${h1} – Pokédex`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title ?? fullTitle)}</title>
<link rel="stylesheet" href="/assets/${assets.css}">
${headExtra}
</head>
<body${bodyAttributes}>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">Pokédex</a>
    <nav aria-label="Site">
      <a href="/">Pokémon</a>
      <a href="/types">Types</a>
    </nav>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-footer">
  <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
</footer>
<script type="module" src="/assets/${assets.js}"></script>
</body>
</html>`;
}
