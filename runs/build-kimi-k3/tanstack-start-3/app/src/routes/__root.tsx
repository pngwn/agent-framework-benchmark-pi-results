import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link to="/" className="brand">
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
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  useEffect(() => {
    document.title = 'Not found – Pokédex'
  }, [])
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  )
}
