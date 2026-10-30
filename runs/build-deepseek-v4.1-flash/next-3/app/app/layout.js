import Link from 'next/link';
import { connection } from 'next/server';
import './tokens.css';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pokédex',
};

const FOOTER_TEXT =
  'Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.';

export default async function RootLayout({ children }) {
  await connection();
  return (
    <html lang="en">
      <body>
        <header className="site-header" role="banner">
          <div className="container header-inner">
            <Link href="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        <main className="container page">{children}</main>
        <footer className="site-footer" role="contentinfo">
          <div className="container">
            <p>{FOOTER_TEXT}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
