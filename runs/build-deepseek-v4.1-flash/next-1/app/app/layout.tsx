import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: {
    default: 'Pokédex',
    template: '%s – Pokédex',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href="/">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Main">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>

        <main className="site-main">{children}</main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
          </div>
        </footer>
      </body>
    </html>
  );
}
