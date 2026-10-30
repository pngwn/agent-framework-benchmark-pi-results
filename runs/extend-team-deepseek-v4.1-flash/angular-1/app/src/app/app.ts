import { Component, DestroyRef, Injector, afterNextRender, inject } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterLink, RouterOutlet, Scroll } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="site-header__brand" routerLink="/">Pokédex</a>
        <nav class="site-header__nav" aria-label="Main">
          <a routerLink="/">Pokémon</a>
          <a routerLink="/types">Types</a>
          <a routerLink="/team">Team</a>
        </nav>
      </div>
    </header>
    <main class="container site-main">
      <router-outlet />
    </main>
    <footer class="site-footer">
      <div class="container">
        Data from PokéAPI. Pokémon and Pokémon character names are trademarks of Nintendo.
      </div>
    </footer>
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);
  private readonly injector = inject(Injector);

  constructor() {
    // Scroll to the top when moving to another page (or another page of results), but
    // keep the position when only a filter or the selected game changes.
    let previous: URL | null = null;
    const subscription = this.router.events.subscribe((event) => {
      if (!(event instanceof Scroll)) return;
      const url = new URL(this.router.url, 'http://app');
      const changedPage =
        previous !== null &&
        (previous.pathname !== url.pathname ||
          previous.searchParams.get('page') !== url.searchParams.get('page'));
      previous = url;
      afterNextRender(
        () => {
          if (event.position) this.scroller.scrollToPosition(event.position);
          else if (event.anchor) this.scroller.scrollToAnchor(event.anchor);
          else if (changedPage) this.scroller.scrollToPosition([0, 0]);
        },
        { injector: this.injector },
      );
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}
