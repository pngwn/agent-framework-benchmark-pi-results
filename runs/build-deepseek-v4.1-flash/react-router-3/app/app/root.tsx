import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import "./tokens.css";
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
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function HashScroller() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scroll = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      document.getElementById(id)?.scrollIntoView();
    };
    timer = setTimeout(scroll, 0);
    const second = setTimeout(scroll, 100);
    return () => {
      clearTimeout(timer);
      clearTimeout(second);
    };
  }, [location.pathname, location.hash]);

  return null;
}

export default function App() {
  return (
    <>
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

      <main className="site-main">
        <div className="container">
          <HashScroller />
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of
          Nintendo.
        </div>
      </footer>
    </>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let title = "Not found";
  let message = "The requested page could not be found.";

  if (isRouteErrorResponse(error)) {
    if (error.status !== 404) {
      title = "Error";
      message = error.statusText || "Something went wrong.";
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <main className="site-main">
      <div className="container">
        <h1>{title}</h1>
        <p>{message}</p>
        <p>
          <Link to="/">Back to the Pokédex</Link>
        </p>
      </div>
    </main>
  );
}
