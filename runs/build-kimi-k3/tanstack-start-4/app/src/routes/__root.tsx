/// <reference types="vite/client" />
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import * as React from 'react'
import { NotFoundPage } from '~/lib/NotFoundPage'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  notFoundComponent: () => <NotFoundPage />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link to="/" className="site-logo">
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
        <Scripts />
      </body>
    </html>
  )
}
