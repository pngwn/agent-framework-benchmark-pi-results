import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: {
    template: '%s – Pokédex',
    default: 'Pokédex',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="container site-main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
