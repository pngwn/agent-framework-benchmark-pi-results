import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: {
    default: 'Pokédex',
    template: '%s – Pokédex',
  },
  description: 'A browsable encyclopedia of Pokémon, moves, abilities and types.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <div className="container headerInner">
            <Link className="brand" href="/">
              Pokédex
            </Link>
            <nav className="siteNav" aria-label="Primary">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="main">
          <div className="container page">{children}</div>
        </main>
        <footer className="siteFooter">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
      </body>
    </html>
  );
}
