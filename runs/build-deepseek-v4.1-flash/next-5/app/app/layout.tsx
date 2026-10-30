import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Pokédex',
    template: '%s – Pokédex',
  },
  description: 'A browsable encyclopedia of Pokémon, moves, abilities and types.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-banner">
          <div className="shell banner-inner">
            <Link href="/" className="brand">
              Pokédex
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/">Pokémon</Link>
              <Link href="/types">Types</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="shell">
            <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
