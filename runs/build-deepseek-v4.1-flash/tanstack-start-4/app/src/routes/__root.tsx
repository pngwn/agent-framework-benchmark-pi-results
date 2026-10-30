import { HeadContent, Scripts, createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { NotFound } from '../components/NotFound'
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
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
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

function RootLayout() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            Pokédex
          </Link>
          <nav aria-label="Main" className="site-nav">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'active' }}>
              Pokémon
            </Link>
            <Link
              to="/types"
              activeProps={{ className: 'active' }}
            >
              Types
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div className="container">
          Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
        </div>
      </footer>
    </>
  )
}
