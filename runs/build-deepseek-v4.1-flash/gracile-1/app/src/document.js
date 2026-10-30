import { html } from '@gracile/gracile/server-html';

export const document = (props) => html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/tokens.css" />
      <link rel="stylesheet" href="/styles.css" />
      <script
        type="module"
        src=${new URL('./document.client.js', import.meta.url).pathname}
      ></script>
      <title>${props.title ?? 'Pokédex'}</title>
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

      <route-template-outlet></route-template-outlet>

      <footer class="site-footer">
        <div class="footer-inner">
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
        </div>
      </footer>
    </body>
  </html>
`;
