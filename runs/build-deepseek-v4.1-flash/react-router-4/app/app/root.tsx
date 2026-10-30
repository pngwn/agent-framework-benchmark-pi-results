import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
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
          <div className="container header-inner">
            <Link to="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Main">
              <Link to="/">Pokémon</Link>
              <Link to="/types">Types</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container">
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </div>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <main className="container page">
      <Outlet />
    </main>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="container page">
      <h1>{notFound ? "Not found" : "Something went wrong"}</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </main>
  );
}
