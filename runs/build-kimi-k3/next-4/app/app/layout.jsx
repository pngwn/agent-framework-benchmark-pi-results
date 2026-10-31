import Link from 'next/link';
import './tokens.css';
import './globals.css';

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
          <div className="site-header-inner">
            <Link href="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
      </body>
    </html>
  );
}
