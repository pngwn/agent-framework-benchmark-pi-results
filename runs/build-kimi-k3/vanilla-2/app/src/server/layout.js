import { escapeHtml } from '../shared/format.js';

export function layout({ title, main, assets }) {
  const css = assets.css.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`).join('\n    ');
  const js = assets.js ? `<script type="module" src="${escapeHtml(assets.js)}"></script>` : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    ${css}
    ${js}
  </head>
  <body>
    <header class="site-header">
      <div class="container site-header-inner">
        <a class="brand" href="/">Pokédex</a>
        <nav class="site-nav">
          <a href="/">Pokémon</a>
          <a href="/types">Types</a>
        </nav>
      </div>
    </header>
    <main class="container">
${main}
    </main>
    <footer class="site-footer">
      <div class="container">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </div>
    </footer>
  </body>
</html>
`;
}
