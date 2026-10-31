import { html } from 'hono/html';

export const layout = ({ title, main }) => html`<!doctype html>
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
        <nav aria-label="Main">
          <a href="/">Pokémon</a>
          <a href="/types">Types</a>
        </nav>
      </div>
    </header>
    <main class="wrap">
      ${main}
    </main>
    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  </body>
</html>`;

export const pageTitle = (h1) => (h1 === 'Pokédex' ? 'Pokédex' : `${h1} – Pokédex`);
