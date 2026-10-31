import type { ReactNode } from "react";
import { Link, Links, Meta, Outlet, Scripts } from "react-router";
import "./tokens.css";
import "./app.css";

export function Layout({ children }: { children: ReactNode }) {
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
          <div className="container site-header-inner">
            <Link to="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav">
              <Link to="/">Pokémon</Link>
              <Link to="/types">Types</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container">
            <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <main className="container site-main">
      <Outlet />
    </main>
  );
}

export function ErrorBoundary() {
  return (
    <main className="container site-main">
      <title>Not found – Pokédex</title>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </main>
  );
}
