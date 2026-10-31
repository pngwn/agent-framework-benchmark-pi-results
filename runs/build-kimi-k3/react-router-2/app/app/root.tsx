import { Links, Meta, Outlet, Scripts, Link } from "react-router";
import type { ReactNode } from "react";
import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import { NotFound } from "./components/ui";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

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
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand">
            Pokédex
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link to="/">Pokémon</Link>
            <Link to="/types">Types</Link>
          </nav>
        </div>
      </header>
      <main className="content">{children}</main>
      <footer className="site-footer">
        <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export function ErrorBoundary() {
  return (
    <Shell>
      <NotFound />
    </Shell>
  );
}
