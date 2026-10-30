import { jsxRenderer } from 'hono/jsx-renderer';

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string }): Response | Promise<Response>;
  }
}

export const renderer = jsxRenderer(({ children, title }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title ? `${title} – Pokédex` : 'Pokédex'}</title>
      <link rel="stylesheet" href="/static/tokens.css" />
      <link rel="stylesheet" href="/static/style.css" />
      <script src="/static/htmx.min.js" defer></script>
    </head>
    <body>
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="/">
            Pokédex
          </a>
          <nav aria-label="Main">
            <ul>
              <li>
                <a href="/">Pokémon</a>
              </li>
              <li>
                <a href="/types">Types</a>
              </li>
              <li>
                <a href="/team">Team</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main class="container">{children}</main>
      <footer class="site-footer">
        <p class="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </body>
  </html>
));
