import Link from 'next/link';
import './tokens.css';
import './globals.css';

export const metadata = {
  title: 'Pokédex',
  description: 'A browsable encyclopedia of Pokémon, moves, abilities and types.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
