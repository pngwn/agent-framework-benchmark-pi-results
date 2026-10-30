import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./tokens.css";
import "./app.css";
import { NotFoundPage } from "./components/NotFoundPage";

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
          <div className="shell site-header-inner">
            <Link className="site-logo" to="/">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Main">
              <Link to="/">Pokémon</Link>
              <Link to="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="shell site-main">{children}</main>
        <footer className="site-footer">
          <div className="shell">
            <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </div>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }
  return (
    <div className="error-page">
      <h1>Something went wrong</h1>
      <p>The page could not be loaded. Please try again.</p>
      <p>
        <Link to="/">Return to the Pokédex</Link>
      </p>
    </div>
  );
}
