import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./tokens.css";
import "./app.css";

export async function loader() {
  const apiBase = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");
  return { apiBase };
}

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
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand">
            Pokédex
          </Link>
          <nav aria-label="Main" className="site-nav">
            <Link to="/">Pokémon</Link>
            <Link to="/types">Types</Link>
          </nav>
        </div>
      </header>
      <main className="container site-main">{children}</main>
      <footer className="site-footer">
        <div className="container">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </div>
      </footer>
    </>
  );
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Pokédex" }];
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
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </Shell>
  );
}
