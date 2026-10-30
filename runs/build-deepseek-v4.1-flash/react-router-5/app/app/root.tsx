import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
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
            <Link className="brand" to="/">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Primary">
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
    <main className="container site-main">
      <Outlet />
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Not found";
  let message = "The requested page could not be found.";
  if (isRouteErrorResponse(error) && error.status !== 404) {
    message = error.statusText || "An unexpected error occurred.";
  } else if (!isRouteErrorResponse(error)) {
    message = "An unexpected error occurred.";
  }
  return (
    <main className="container site-main">
      <div className="page">
        <h1>{error && isRouteErrorResponse(error) && error.status !== 404 ? "Error" : "Not found"}</h1>
        <p>{message}</p>
        <p>
          <a href="/">Back to the Pokédex</a>
        </p>
      </div>
      <title>{`${isRouteErrorResponse(error) && error.status !== 404 ? "Error" : title} – Pokédex`}</title>
    </main>
  );
}
