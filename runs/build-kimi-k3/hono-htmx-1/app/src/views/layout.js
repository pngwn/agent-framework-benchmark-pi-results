import { html } from 'hono/html';

// Shared page shell: banner with brand link, navigation, single main landmark,
// contentinfo footer. Each page composes its own <h1> inside `main`.
export function layout({ title, main }) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/static/tokens.css" />
    <link rel="stylesheet" href="/static/app.css" />
    <script src="/static/htmx.min.js" defer></script>
    <script src="/static/app.js" defer></script>
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
      ${main}
    </main>
    <footer class="site-footer">
      <div class="wrap">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </div>
    </footer>
  </body>
</html>`;
}
