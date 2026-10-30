import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand">
          Pokédex
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'active' }}>
            Pokémon
          </Link>
          <Link to="/types" activeProps={{ className: 'active' }}>
            Types
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </div>
    </footer>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  )
}

export function NotFoundPage() {
  return (
    <Page>
      <main className="page">
        <h1>Not found</h1>
        <p>
          <Link to="/">Back to the Pokédex</Link>
        </p>
      </main>
    </Page>
  )
}
