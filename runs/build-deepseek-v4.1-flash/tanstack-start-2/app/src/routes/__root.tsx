import type { ReactNode } from 'react'
import {
  Link,
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Pokédex' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">Pokédex</Link>
          <nav className="site-nav" aria-label="Main navigation">
            <Link to="/">Pokémon</Link>
            <Link to="/types">Types</Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div className="container">
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
        </div>
      </footer>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
