import Link from 'next/link';

import '@/styles/tokens.css';
import '@/styles/globals.css';

export const metadata = {
  title: {
    default: 'Pokédex',
    template: '%s – Pokédex',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap header-inner">
            <Link className="brand" href="/">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Main">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="wrap site-main">{children}</main>
        <footer className="site-footer">
          <p>
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of
            Nintendo.
          </p>
        </footer>
      </body>
    </html>
  );
}
