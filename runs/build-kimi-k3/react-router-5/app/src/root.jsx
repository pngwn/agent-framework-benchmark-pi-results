import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from 'react-router';
import stylesheet from './styles.css?url';

export function links() {
  return [{ rel: 'stylesheet', href: stylesheet }];
}

export function Layout({ children }) {
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

function Shell({ children }) {
  return (
    <div className="site">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            Pokédex
          </Link>
          <nav aria-label="Site" className="site-nav">
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
    </div>
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
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <Shell>
      <title>{notFound ? 'Not found – Pokédex' : 'Error – Pokédex'}</title>
      <h1>{notFound ? 'Not found' : 'Something went wrong'}</h1>
      {notFound ? (
        <p>
          <Link to="/">Back to the Pokédex</Link>
        </p>
      ) : (
        <p>An unexpected error occurred.</p>
      )}
    </Shell>
  );
}
