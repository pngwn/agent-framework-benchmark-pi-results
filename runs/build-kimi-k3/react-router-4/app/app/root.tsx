import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { NotFound } from "./components/not-found";
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
          <div className="container site-header-inner">
            <Link to="/" className="site-brand">
              Pokédex
            </Link>
            <nav className="site-nav">
              <Link to="/">Pokémon</Link>
              <Link to="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="container site-main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>
              Data from PokéAPI. Pokémon and Pokémon character names are trademarks of
              Nintendo.
            </p>
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
    return <NotFound />;
  }
  return (
    <>
      <h1>Something went wrong</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
