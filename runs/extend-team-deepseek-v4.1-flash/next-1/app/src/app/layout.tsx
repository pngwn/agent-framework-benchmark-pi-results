import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Pokédex', template: '%s – Pokédex' },
  description: 'A browsable encyclopedia of Pokémon, moves, abilities and types.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="site-title" href="/">
              Pokédex
            </Link>
            <nav aria-label="Main">
              <ul>
                <li>
                  <Link href="/">Pokémon</Link>
                </li>
                <li>
                  <Link href="/types">Types</Link>
                </li>
                <li>
                  <Link href="/team">Team</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="site-footer">
          <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
      </body>
    </html>
  );
}
