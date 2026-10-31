import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" routerLink="/">Pokédex</a>
        <nav class="site-nav" aria-label="Site">
          <a routerLink="/">Pokémon</a>
          <a routerLink="/types">Types</a>
        </nav>
      </div>
    </header>
    <main class="content">
      <router-outlet />
    </main>
    <footer class="site-footer">
      <p>Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.</p>
    </footer>
  `,
  styleUrl: './app.css',
})
export class App {}
