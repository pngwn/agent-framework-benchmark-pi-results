import { html } from '@gracile/gracile/server-html';

export const document = (props) => html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${props.title ?? 'Pokédex'}</title>
      <link rel="stylesheet" href="/src/styles/global.css" />
    </head>
    <body>
      <header class="site-header">
        <div class="wrap site-header-inner">
          <a class="brand" href="/">Pokédex</a>
          <nav class="site-nav">
            <a href="/">Pokémon</a>
            <a href="/types">Types</a>
          </nav>
        </div>
      </header>
      <main class="wrap" id="main">
        <route-template-outlet></route-template-outlet>
      </main>
      <footer class="site-footer">
        <div class="wrap">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </div>
      </footer>
    </body>
  </html>
`;
