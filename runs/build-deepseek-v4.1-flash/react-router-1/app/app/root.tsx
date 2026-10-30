import type { LinksFunction } from 'react-router';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from 'react-router';
import stylesheet from './app.css?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
];

export function meta() {
  return [{ title: 'Pokédex' }];
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" to="/">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <Link to="/">Pokémon</Link>
              <Link to="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
        <footer className="site-footer">
          <p>
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks
            of Nintendo.
          </p>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
