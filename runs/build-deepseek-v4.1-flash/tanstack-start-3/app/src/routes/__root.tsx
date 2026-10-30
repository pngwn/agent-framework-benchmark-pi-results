import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="banner">
          <div className="banner-inner">
            <Link to="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Main navigation">
              <Link to="/">Pokémon</Link>
              <Link to="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </p>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
