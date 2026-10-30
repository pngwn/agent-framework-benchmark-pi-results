import type { ReactNode } from 'react'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { getConfig } from '../server/functions'
import { pageTitle } from '../lib/format'
import { TeamProvider } from '../lib/team-context'
import tokensCss from '../tokens.css?url'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  loader: () => getConfig(),
  staleTime: Infinity,
  shouldReload: false,
  head: ({ matches }) => {
    const notFound = matches.some((m) => m.status === 'notFound' || m._notFound)
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: notFound ? pageTitle('Not found') : pageTitle() },
      ],
      links: [
        { rel: 'stylesheet', href: tokensCss },
        { rel: 'stylesheet', href: appCss },
      ],
    }
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <TeamProvider>
        <Outlet />
      </TeamProvider>
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
          <div className="site-header-inner">
            <Link to="/" className="site-title">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul className="site-nav">
                <li>
                  <Link to="/">Pokémon</Link>
                </li>
                <li>
                  <Link to="/types">Types</Link>
                </li>
                <li>
                  <Link to="/team">Team</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
