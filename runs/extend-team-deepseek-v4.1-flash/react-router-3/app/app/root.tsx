import { isRouteErrorResponse, Link, Links, Meta, NavLink, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./tokens.css";
import "./app.css";
import { pageTitle } from "./lib/format";

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
          <div className="container site-header__inner">
            <Link to="/" className="site-header__brand">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul className="site-nav">
                <li>
                  <NavLink to="/" end>
                    Pokémon
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/types">Types</NavLink>
                </li>
                <li>
                  <NavLink to="/team">Team</NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="container site-main">{children}</main>
        <footer className="site-footer">
          <p className="container">Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  if (import.meta.env.DEV) console.error(error);
  return (
    <>
      <title>{pageTitle("Something went wrong")}</title>
      <h1>Something went wrong</h1>
      <p>The page couldn’t be loaded. Please try again.</p>
      <p className="page-message">
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}

export function NotFound() {
  return (
    <>
      <title>{pageTitle("Not found")}</title>
      <h1>Not found</h1>
      <p className="page-message">
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
