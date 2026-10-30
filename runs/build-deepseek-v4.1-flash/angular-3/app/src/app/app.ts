import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" routerLink="/">Pokédex</a>
        <nav class="site-nav" aria-label="Main">
          <a routerLink="/">Pokémon</a>
          <a routerLink="/types">Types</a>
        </nav>
      </div>
    </header>

    <main class="container page-main">
      <router-outlet />
    </main>

    <footer class="site-footer">
      <p>
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </p>
    </footer>
  `,
})
export class App {}
