import { html } from '@gracile/gracile/server-html';

export const document = (context) => {
  const props = context?.props?.GET;
  const title = props?.pageTitle ?? 'Pokédex';

  return html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <link rel="stylesheet" href=${new URL('./document.css', import.meta.url).pathname} />
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

        <main class="container page-main">
          <route-template-outlet></route-template-outlet>
        </main>

        <footer class="site-footer">
          <div class="container">
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </div>
        </footer>
      </body>
    </html>
  `;
};
