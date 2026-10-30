/// <reference types="vite/client" />
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { NotFoundPage } from '~/components/NotFoundPage'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Pokédex' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="container header-inner">
              <Link to="/" className="brand" aria-label="Pokédex">
                Pokédex
              </Link>
              <nav className="site-nav" aria-label="Primary">
                <Link to="/">Pokémon</Link>
                <Link to="/types">Types</Link>
              </nav>
            </div>
          </header>
          <main className="container main-content">{children}</main>
          <footer className="site-footer">
            <div className="container">
              Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
            </div>
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
